
/**
 * Main Error for Gamesparks engine
 */
export class GamesparksError extends Error {

  /**
   * GamesparksError constructor.
   */
  constructor() {
    super('Error');
    this.name = 'GamesparksError';
    this.message = `GamesparksError.`;
  }
}

/**
 * Error representing an object that doesn't exists.
 */
export class NotFoundError extends GamesparksError {
  public modelType: string;

  /**
   * NotFoundError constructor.
   * @param modelType Type of the object that wasn't found.
   */
  constructor(modelType = 'Object') {
    super();
    this.name = 'NotFoundError';
    this.message = `${modelType} not found.`;
    this.modelType = modelType;
  }
}

/**
 * Error representing a malformed request.
 */
export class BadRequestError extends GamesparksError {

  /**
   * BadRequestError constructor.
   * @param message Message explaining the error.
   */
  constructor(message: string) {
    super();
    this.name = 'BadRequestError';
    this.message = message;
  }
}

/**
 * Error representing an unauthorized request.
 */
export class ForbiddenError extends GamesparksError {

  /**
   * ForbiddenError constructor.
   * @param message Message explaining the error.
   */
  constructor(message: string) {
    super();
    this.name = 'ForbiddenError';
    this.message = message;
  }
}
