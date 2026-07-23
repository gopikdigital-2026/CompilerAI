import type {
  Connector,
  ConnectorMetadata,
  ConnectorCapability,
  ConnectorAuthRequirements,
  ConnectorCredentials,
  ConnectorContext,
  ConnectorResult,
  ConnectorError,
  ConnectorStatus,
} from '../types/index';

export abstract class BaseConnector implements Connector {
  protected credentials: ConnectorCredentials | null = null;
  protected context: ConnectorContext | null = null;
  protected status: ConnectorStatus = 'registered';

  constructor(
    private readonly _metadata: ConnectorMetadata,
    private readonly _capabilities: ConnectorCapability[],
    private readonly _authRequirements: ConnectorAuthRequirements,
  ) {}

  get metadata(): ConnectorMetadata {
    return this._metadata;
  }

  get capabilities(): ConnectorCapability[] {
    return this._capabilities;
  }

  get authRequirements(): ConnectorAuthRequirements {
    return this._authRequirements;
  }

  async initialize(credentials: ConnectorCredentials, context: ConnectorContext): Promise<void> {
    this.credentials = credentials;
    this.context = context;
    this.status = 'configured';
    await this.onInitialize();
  }

  isInitialized(): boolean {
    return this.status === 'connected' || this.status === 'configured';
  }

  getStatus(): ConnectorStatus {
    return this.status;
  }

  async execute(capability: string, input: Record<string, unknown>, context: ConnectorContext): Promise<ConnectorResult> {
    if (!this.isInitialized()) {
      return this.fail('CONNECTOR_NOT_INITIALIZED', 'Connector has not been initialized', 'auth');
    }

    const cap = this._capabilities.find((c) => c.name === capability);
    if (!cap) {
      return this.fail('CAPABILITY_NOT_FOUND', `Capability '${capability}' is not supported by ${this._metadata.id}`, 'validation');
    }

    const startTime = Date.now();
    try {
      this.status = 'connected';
      const result = await this.onExecute(capability, input, context);
      this.status = 'connected';
      return {
        success: true,
        data: result,
        error: null,
        metadata: {
          connectorId: this._metadata.id,
          capability,
          durationMs: Date.now() - startTime,
          requestId: context.requestId,
          timestamp: new Date().toISOString(),
        },
      };
    } catch (e) {
      this.status = 'error';
      const error = this.toError(e);
      return {
        success: false,
        data: null,
        error,
        metadata: {
          connectorId: this._metadata.id,
          capability,
          durationMs: Date.now() - startTime,
          requestId: context.requestId,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  async disconnect(): Promise<void> {
    this.credentials = null;
    this.context = null;
    this.status = 'disconnected';
    await this.onDisconnect();
  }

  protected abstract onInitialize(): Promise<void>;
  protected abstract onExecute(capability: string, input: Record<string, unknown>, context: ConnectorContext): Promise<unknown>;
  protected onDisconnect(): Promise<void> {
    return Promise.resolve();
  }

  protected fail(code: string, message: string, category: ConnectorError['category']): ConnectorResult {
    const error: ConnectorError = {
      code,
      message,
      category,
      retryable: category === 'rate_limit' || category === 'network' || category === 'timeout',
      details: null,
    };
    return {
      success: false,
      data: null,
      error,
      metadata: {
        connectorId: this._metadata.id,
        capability: '',
        durationMs: 0,
        requestId: this.context?.requestId ?? '',
        timestamp: new Date().toISOString(),
      },
    };
  }

  private toError(e: unknown): ConnectorError {
    if (e instanceof Error) {
      return {
        code: 'CONNECTOR_ERROR',
        message: e.message,
        category: 'unknown',
        retryable: false,
        details: null,
      };
    }
    return {
      code: 'UNKNOWN_ERROR',
      message: 'An unknown error occurred',
      category: 'unknown',
      retryable: false,
      details: null,
    };
  }
}
