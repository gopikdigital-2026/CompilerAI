export class ConnectorError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'ConnectorError';
  }
}

export class ConnectorAlreadyRegisteredError extends ConnectorError {
  constructor(message: string) {
    super(message, 'CONNECTOR_ALREADY_REGISTERED');
    this.name = 'ConnectorAlreadyRegisteredError';
  }
}

export class ConnectorNotFoundError extends ConnectorError {
  constructor(message: string) {
    super(message, 'CONNECTOR_NOT_FOUND');
    this.name = 'ConnectorNotFoundError';
  }
}

export class ConnectorValidationError extends ConnectorError {
  constructor(
    message: string,
    public readonly errors: string[] = [],
  ) {
    super(message, 'CONNECTOR_VALIDATION_FAILED');
    this.name = 'ConnectorValidationError';
  }
}

export class ConnectorAuthenticationError extends ConnectorError {
  constructor(message: string) {
    super(message, 'CONNECTOR_AUTH_FAILED');
    this.name = 'ConnectorAuthenticationError';
  }
}

export class ConnectorCapabilityError extends ConnectorError {
  constructor(message: string) {
    super(message, 'CONNECTOR_CAPABILITY_NOT_SUPPORTED');
    this.name = 'ConnectorCapabilityError';
  }
}
