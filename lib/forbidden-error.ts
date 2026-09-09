export class ForbiddenError extends Error {
  constructor(message = "Action non autorisée") {
    super(message);
    this.name = "ForbiddenError";
  }
}