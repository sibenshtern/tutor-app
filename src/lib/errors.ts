export class DomainError extends Error {
  name = "DomainError";
}

export class HttpError extends Error {
  name = "HttpError";
  constructor(
    public readonly status: number,
    message: string,
    public readonly fields?: Record<string, string>,
  ) {
    super(message);
  }
}

export class UnauthorizedError extends Error {
  name = "UnauthorizedError";
}

export class RateLimitedError extends Error {
  name = "RateLimitedError";
}
