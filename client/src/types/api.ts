export interface ApiResponse<T> {
  status: "success";
  data: T;
}

export interface ApiError {
  status: "error";
  message: string;
}
