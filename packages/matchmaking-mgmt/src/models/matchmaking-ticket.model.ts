import DynamoDB from 'aws-sdk/clients/dynamodb';
import Ajv, { ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';

import { BadRequestError, NotFoundError } from './errors';
import MatchmakingTicketSchema from '../schemas/matchmaking-ticket.schema.json';

const ajv = new Ajv();
addFormats(ajv);

export enum MatchmakingStatus {
  MatchmakingSucceeded = 'MatchmakingSucceeded',
  MatchmakingSearching = 'MatchmakingSearching',
  PotentialMatchCreated = 'PotentialMatchCreated',
  MatchmakingFailed = 'MatchmakingFailed',
  MatchmakingTimedOut = 'MatchmakingTimedOut',
  MatchmakingCancelled = 'MatchmakingCancelled'
}

export interface MatchmakingTicket {
  /** Matchmaking Ticket id */
  ticketId: string;
  /** Matchmaking status */
  matchmakingStatus: MatchmakingStatus;
  /** Matchmaking Player session ID **/
  playerSessionId?: string;
  /** Matchmaking connection ip */
  ip?: string;
  /** Matchmaking connection port */
  port?: string;
  /** Matchmaking connection DNS name */
  dnsName?: string;
  /** TTL */
  ttl: number;
}

/**
 * Model to interact with matchmaking ticket objects.
 */
export class MatchmakingTicketModel {
  /** DynamoDB client */
  private client: DynamoDB.DocumentClient;
  /** Matchmaking ticket table name */
  private table: string;
  /** JSON schema validate function */
  private validateSchema: ValidateFunction;

  /**
   * Matchmaking ticketModel constructor.
   * @param table Matchmaking ticket table name.
   * @param client DynamoDB client, if undefined it will be created in the constructor.
   */
  constructor(table: string, client = new DynamoDB.DocumentClient()) {
    this.table = table;
    this.client = client;
    this.validateSchema = ajv.compile(MatchmakingTicketSchema);
  }

  /**
   * Retrieve a single matchmaking ticket if it exists.
   * @param ticketId matchmaking ticket id.
   * @returns The existing MatchMaking ticket.
   */
  getById(ticketId: string): Promise<MatchmakingTicket> {
    return this.client.get({
      TableName: this.table,
      Key: {
        ticketId: ticketId,
      },
    }).promise()
      .then((resp) => {
        if (!resp.Item) {
          console.log(`Matchmaking ticket with id '${ticketId}' has not been found'`)
          throw new NotFoundError(`Matchmaking ticket with id '${ticketId}''`);
        }
        return resp.Item as MatchmakingTicket;
      });
  }

  /**
   * Retrieve a single matchmaking ticket if it exists.
   * @param ticketId matchmaking ticket id.
   * @returns The existing MatchMaking ticket.
   */
  getItem(ticketId: string): Promise<MatchmakingTicket | undefined> {
    return this.client.get({
      TableName: this.table,
      Key: {
        ticketId: ticketId,
      },
    }).promise()
      .then((resp) => {
        if (!resp.Item) {
          console.log(`Matchmaking ticket with id '${ticketId}' has not been found'`)
          return undefined
        }
        return resp.Item as MatchmakingTicket;
      });
  }

  /**
   * List all matchmaking tickets.
   * @returns All of the existing matchmaking ticket.
   */
  getAll(): Promise<MatchmakingTicket[]> {
    // Get all matchmaking tickets
    return this.client.scan({
      TableName: this.table,
    }).promise()
      .then((resp) => resp.Items as MatchmakingTicket[] || []);
  }

  /**
   * Create or Update a matchmaking ticket.
   * @param matchmaking ticketInput Matchmaking ticket input that will be validated.
   */
  async createOrUpdate(matchmakingTicket: MatchmakingTicket, currentMatchmakingTicket?: MatchmakingTicket): Promise<MatchmakingTicket> {
    return currentMatchmakingTicket? this.update(matchmakingTicket, currentMatchmakingTicket) : this.create(matchmakingTicket);
  }

  /**
   * Create a new matchmaking ticket. Check that the input is valid. Generate a uuid id.
   * Retry on uuid collision.
   * @param matchmaking ticketInput Matchmaking ticket input that will be validated.
   * @param retry Number of remaining retry in case of uuid collision.
   * @returns The created matchmaking ticket.
   */
  async create(matchmakingTicketInput: Partial<MatchmakingTicket>, retry = 2): Promise<MatchmakingTicket> {
    const matchmakingTicket = {
      ...matchmakingTicketInput,
      ttl: 0,
    } as MatchmakingTicket;

    this.validate(matchmakingTicket);

    try {
      await this.client.put({
        TableName: this.table,
        Item: matchmakingTicket,
        ConditionExpression: 'attribute_not_exists(ticketId)',
      }).promise();
      return matchmakingTicket;
    } catch (err: any) {
      if (err.code === 'ConditionalCheckFailedException' && retry > 0) {
        console.log(`Matchmaking ticket with ticket id '${matchmakingTicket.ticketId}' already exists. Re-trying with a different ticket id.`);
        return this.create(matchmakingTicketInput, retry - 1);
      } else {
        throw err;
      }
    }
  }

  /**
   * Update an existing matchmaking ticket. Check that the input is valid and the object already exists.
   * @param matchmaking ticketInput Matchmaking ticket input that will be validated.
   * @returns The updated matchmaking ticket.
   */
  async update(matchmakingTicket: MatchmakingTicket, currentMatchmakingTicket?: MatchmakingTicket): Promise<MatchmakingTicket> {
    const tchMakingTicket = currentMatchmakingTicket || await this.getById(matchmakingTicket.ticketId);
    const { ticketId } = matchmakingTicket;
    const updatedMatchmakingTicket = {
      ...matchmakingTicket,
      ttl: 0,
    } as MatchmakingTicket;

    this.validate(updatedMatchmakingTicket);

    try {
      await this.client.put({
        TableName: this.table,
        Item: updatedMatchmakingTicket,
        ConditionExpression: 'attribute_exists(ticketId)',
      }).promise();
      return updatedMatchmakingTicket;
    } catch (err: any) {
      if (err.code === 'ConditionalCheckFailedException') {
        throw new NotFoundError(`Matchmaking ticket with ticket id '${matchmakingTicket.ticketId}'`);
      } else {
        throw err;
      }
    }
  }

  /**
   * Delete an existing matchmaking ticket.
   * @param id Matchmaking ticket id.
   */
  delete(ticketId: string) {
    return this.client.delete({
      TableName: this.table,
      Key: { ticketId },
      ConditionExpression: 'attribute_exists(ticketId)',
    }).promise()
      .catch((err) => {
        if (err.code === 'ConditionalCheckFailedException') {
          throw new NotFoundError(`Matchmaking ticket with ticket id '${ticketId}'`);
        } else {
          throw err;
        }
      });
  }

  /**
   * Validate the matchmaking ticket object.
   * @param matchmaking ticket The matchmaking ticket object to be validated.
   * @returns The validated matchmaking ticket object.
   */
  validate(matchmakingTicket: MatchmakingTicket): MatchmakingTicket {
    if (this.validateSchema(matchmakingTicket)) {
      return matchmakingTicket;
    } else {
      throw new BadRequestError(this.validateSchema.errors && this.validateSchema.errors[0].message || 'Validation error');
    }
  }

  /**
   * Parse a string body to an Matchmaking ticket object with JSON schema validation.
   * @param body String containing a Matchmaking ticket object.
   * @throws {BadRequestError} on parsing and validation error.
   */
  parse(body: string): MatchmakingTicket {
    let matchmakingTicket;
    try {
      matchmakingTicket = JSON.parse(body);
    } catch {
      throw new BadRequestError('Invalid JSON');
    }
    return matchmakingTicket;
  }

}
