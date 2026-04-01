import { screen } from "@testing-library/react";
import type userEvent from "@testing-library/user-event";

/**
 * Select an option in a SearchableSelect component during tests.
 * The component uses a button trigger + dropdown with option buttons.
 *
 * @param user - userEvent instance
 * @param testId - data-testid of the SearchableSelect trigger button
 * @param optionValue - the value of the option to select
 */
export async function selectSearchableOption(
  user: ReturnType<typeof userEvent.setup>,
  testId: string,
  optionValue: string,
): Promise<void> {
  await user.click(screen.getByTestId(testId));
  await user.click(screen.getByTestId(`${testId}-option-${optionValue}`));
}
