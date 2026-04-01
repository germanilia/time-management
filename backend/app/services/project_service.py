import uuid

from app.core.exceptions import NotFoundException
from app.dao.assignment_dao import AssignmentDao
from app.dao.phase_dao import PhaseDao
from app.dao.project_dao import ProjectDao
from app.dao.role_requirement_dao import RoleRequirementDao
from app.enums.project_status import ProjectStatus
from app.schemas.assignment import AssignmentCreate, AssignmentResponse
from app.schemas.project import (
    PhaseCreate,
    PhaseResponse,
    PhaseUpdate,
    ProjectCreate,
    ProjectUpdate,
    ProjectWithPhasesResponse,
)


class ProjectService:
    def __init__(
        self,
        project_dao: ProjectDao,
        phase_dao: PhaseDao,
        role_requirement_dao: RoleRequirementDao,
        assignment_dao: AssignmentDao | None = None,
    ) -> None:
        self.project_dao = project_dao
        self.phase_dao = phase_dao
        self.role_req_dao = role_requirement_dao
        self.assignment_dao = assignment_dao

    async def _save_assignments_by_phase_order(
        self, project_id: uuid.UUID
    ) -> dict[int, list[AssignmentResponse]]:
        """Load existing assignments grouped by phase_order for later restoration."""
        if not self.assignment_dao:
            return {}
        existing_phases = await self.phase_dao.list_by_project(project_id)
        result: dict[int, list[AssignmentResponse]] = {}
        for phase in existing_phases:
            assignments = await self.assignment_dao.list_by_phase(phase.id)
            if assignments:
                result[phase.phase_order] = assignments
        return result

    async def _restore_assignments(
        self,
        new_phases: list[PhaseResponse],
        saved: dict[int, list[AssignmentResponse]],
        skip_by_order: set[tuple[int, uuid.UUID]] | None = None,
    ) -> set[tuple[uuid.UUID, uuid.UUID]]:
        """Re-create saved assignments mapped to new phase IDs by phase_order.

        Assignments whose (phase_order, employee_id) appear in *skip_by_order*
        are NOT restored — the caller will create them from fresh form data so
        that user-supplied values (allocation %, rate, etc.) take precedence.

        Returns set of (phase_id, employee_id) tuples that were restored.
        """
        restored: set[tuple[uuid.UUID, uuid.UUID]] = set()
        if not self.assignment_dao or not saved:
            return restored
        phase_by_order = {p.phase_order: p for p in new_phases}
        for phase_order, assignments in saved.items():
            new_phase = phase_by_order.get(phase_order)
            if not new_phase:
                continue
            for old in assignments:
                if skip_by_order and (phase_order, old.employee_id) in skip_by_order:
                    continue
                await self.assignment_dao.create(
                    AssignmentCreate(
                        project_id=new_phase.project_id,
                        phase_id=new_phase.id,
                        employee_id=old.employee_id,
                        allocation_type=old.allocation_type,
                        allocated_hours=old.allocated_hours,
                        allocation_percentage=old.allocation_percentage,
                        hourly_rate_override=old.hourly_rate_override,
                        start_date=old.start_date,
                        end_date=old.end_date,
                    )
                )
                restored.add((new_phase.id, old.employee_id))
        return restored

    async def _create_phase_assignments(
        self,
        phases: list[PhaseResponse],
        phase_data_list: list[PhaseCreate],
        restored_keys: set[tuple[uuid.UUID, uuid.UUID]],
    ) -> None:
        """Create new assignments from PhaseCreate.new_assignments, skipping duplicates."""
        if not self.assignment_dao:
            return
        for phase, phase_data in zip(phases, phase_data_list):
            for new_assign in phase_data.new_assignments:
                key = (phase.id, new_assign.employee_id)
                if key in restored_keys:
                    continue
                await self.assignment_dao.create(
                    AssignmentCreate(
                        project_id=phase.project_id,
                        phase_id=phase.id,
                        employee_id=new_assign.employee_id,
                        allocation_type=new_assign.allocation_type,
                        allocated_hours=new_assign.allocated_hours,
                        allocation_percentage=new_assign.allocation_percentage,
                        hourly_rate_override=new_assign.hourly_rate_override,
                        start_date=new_assign.start_date or phase.start_date,
                        end_date=new_assign.end_date or phase.end_date,
                    )
                )

    async def _enrich_phase(self, phase: PhaseResponse) -> PhaseResponse:
        """Attach role requirements to a phase response."""
        reqs = await self.role_req_dao.list_by_phase(phase.project_id, phase.id)
        return phase.model_copy(update={"role_requirements": reqs})

    async def _enrich_phases(
        self, phases: list[PhaseResponse]
    ) -> list[PhaseResponse]:
        return [await self._enrich_phase(p) for p in phases]

    async def list_all(
        self,
        status: ProjectStatus | None = None,
        funding_source_id: uuid.UUID | None = None,
    ) -> list[ProjectWithPhasesResponse]:
        projects = await self.project_dao.list_all(
            status=status, funding_source_id=funding_source_id
        )
        result = []
        for proj in projects:
            phases = await self.phase_dao.list_by_project(proj.id)
            enriched = await self._enrich_phases(phases)
            result.append(
                ProjectWithPhasesResponse(**proj.model_dump(), phases=enriched)
            )
        return result

    async def get_by_id(
        self, project_id: uuid.UUID
    ) -> ProjectWithPhasesResponse:
        project = await self.project_dao.get_by_id(project_id)
        if not project:
            raise NotFoundException("Project", str(project_id))
        phases = await self.phase_dao.list_by_project(project_id)
        enriched = await self._enrich_phases(phases)
        return ProjectWithPhasesResponse(**project.model_dump(), phases=enriched)

    async def create(self, data: ProjectCreate) -> ProjectWithPhasesResponse:
        project = await self.project_dao.create(data)
        phases: list[PhaseResponse] = []
        for phase_data in data.phases:
            phase = await self.phase_dao.create(project.id, phase_data)
            # Create inline role requirements
            for rr in phase_data.role_requirements:
                await self.role_req_dao.create(project.id, rr, phase_id=phase.id)
            enriched = await self._enrich_phase(phase)
            phases.append(enriched)

        # Create inline assignments from phase data
        await self._create_phase_assignments(phases, list(data.phases), set())

        return ProjectWithPhasesResponse(**project.model_dump(), phases=phases)

    async def update(
        self, project_id: uuid.UUID, data: ProjectUpdate
    ) -> ProjectWithPhasesResponse:
        existing = await self.project_dao.get_by_id(project_id)
        if not existing:
            raise NotFoundException("Project", str(project_id))
        updated = await self.project_dao.update(project_id, data)
        if not updated:
            raise NotFoundException("Project", str(project_id))

        if data.phases is not None:
            # Preserve existing assignments before phase sync
            saved_assignments = await self._save_assignments_by_phase_order(
                project_id
            )

            # Full sync: delete old role requirements and phases, recreate from scratch
            # (cascade deletes assignments via FK ondelete=CASCADE)
            await self.role_req_dao.delete_by_project(project_id)
            await self.phase_dao.delete_by_project(project_id)
            phases: list[PhaseResponse] = []
            for phase_data in data.phases:
                phase = await self.phase_dao.create(project_id, phase_data)
                for rr in phase_data.role_requirements:
                    await self.role_req_dao.create(project_id, rr, phase_id=phase.id)
                enriched = await self._enrich_phase(phase)
                phases.append(enriched)

            # Build set of (phase_order, employee_id) that the user explicitly
            # set via the form so these take precedence over auto-restored ones.
            new_assignment_keys: set[tuple[int, uuid.UUID]] = set()
            for phase_data in data.phases:
                for new_assign in phase_data.new_assignments:
                    new_assignment_keys.add(
                        (phase_data.phase_order, new_assign.employee_id)
                    )

            # Restore old assignments, skipping any covered by new form data
            restored_keys = await self._restore_assignments(
                phases, saved_assignments, skip_by_order=new_assignment_keys
            )

            # Create new assignments from phase data (deduped against restored)
            await self._create_phase_assignments(
                phases, list(data.phases), restored_keys
            )
        else:
            existing_phases = await self.phase_dao.list_by_project(project_id)
            phases = await self._enrich_phases(existing_phases)

        return ProjectWithPhasesResponse(**updated.model_dump(), phases=phases)

    async def delete(self, project_id: uuid.UUID) -> None:
        existing = await self.project_dao.get_by_id(project_id)
        if not existing:
            raise NotFoundException("Project", str(project_id))
        await self.project_dao.delete(project_id)

    async def add_phase(
        self, project_id: uuid.UUID, data: PhaseCreate
    ) -> PhaseResponse:
        existing = await self.project_dao.get_by_id(project_id)
        if not existing:
            raise NotFoundException("Project", str(project_id))
        phase = await self.phase_dao.create(project_id, data)
        for rr in data.role_requirements:
            await self.role_req_dao.create(project_id, rr, phase_id=phase.id)
        return await self._enrich_phase(phase)

    async def list_phases(
        self, project_id: uuid.UUID
    ) -> list[PhaseResponse]:
        existing = await self.project_dao.get_by_id(project_id)
        if not existing:
            raise NotFoundException("Project", str(project_id))
        phases = await self.phase_dao.list_by_project(project_id)
        return await self._enrich_phases(phases)

    async def update_phase(
        self, project_id: uuid.UUID, phase_id: uuid.UUID, data: PhaseUpdate
    ) -> PhaseResponse:
        phase = await self.phase_dao.get_by_id(phase_id)
        if not phase or phase.project_id != project_id:
            raise NotFoundException("Phase", str(phase_id))
        updated = await self.phase_dao.update(phase_id, data)
        if not updated:
            raise NotFoundException("Phase", str(phase_id))
        return await self._enrich_phase(updated)

    async def delete_phase(
        self, project_id: uuid.UUID, phase_id: uuid.UUID
    ) -> None:
        phase = await self.phase_dao.get_by_id(phase_id)
        if not phase or phase.project_id != project_id:
            raise NotFoundException("Phase", str(phase_id))
        await self.phase_dao.delete(phase_id)
