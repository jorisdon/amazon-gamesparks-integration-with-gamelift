// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import {DocumentClient} from 'aws-sdk/clients/dynamodb';
import { Logger } from '@aws-lambda-powertools/logger';
import { Tracer } from '@aws-lambda-powertools/tracer';
import {MatchmakingStatus, MatchmakingTicket, MatchmakingTicketModel} from '../models';

const logger = new Logger();
const tracer = new Tracer();

const TABLE = process.env.MATCHMAKING_TICKET_TABLE_NAME || 'MatchmakingTicket';

const client = new DocumentClient();
const matchmakingTicketModel = new MatchmakingTicketModel(TABLE, client);

/**
 * ProcessMatchmakingEvents
 * Handler to process matchmaking events from a Topic
 */
const processMatchmakingEvents = async (event: any, context: any, callback: any) => {
  // Annotate the segment with the cold start & serviceName
  tracer.annotateColdStart();
  tracer.addServiceNameAnnotation();
  //Parse the FlexMatch message
  var message = event.Records[0].Sns.Message;
  message = JSON.parse(message);
  logger.info('Message received from SNS:', message);
  logger.info('Event type:' + message.detail.type)
  var type = message.detail.type as MatchmakingStatus;
  // Only process if we get any of the following status updates:
  // 1. MatchmakingSearching
  // 2. PotentialMatchCreated
  // 3. MatchmakingSucceeded | MatchmakingFailed | MatchmakingTimedOut | MatchmakingCancelled
  if (type === MatchmakingStatus.MatchmakingSucceeded
    || type === MatchmakingStatus.MatchmakingSearching
    || type === MatchmakingStatus.PotentialMatchCreated
    || type === MatchmakingStatus.MatchmakingFailed
    || type === MatchmakingStatus.MatchmakingTimedOut
    || type === MatchmakingStatus.MatchmakingCancelled) {
    // Get Epoch for TTL, we expire in 1 hour
    var date = new Date();
    date.setHours(date.getHours() + 1);
    var epochDate = date.getTime() / 1000;

    // Go through the tickets and write to DynamoDB
    for (var i = 0; i < message.detail.tickets.length; i++) {
      const ticketId = message.detail.tickets[i].ticketId;
      // Note: We know there's only one player session in each ticket, this might be different based on your implementation!
      const playerSessionId = message.detail.tickets[i].players[0].playerSessionId;
      console.log("Ticket: " + ticketId);
      console.log("PlayerSessionId: " + playerSessionId);

      // Fetch previous item (if any)
      const existingTicket = await matchmakingTicketModel.getItem(ticketId);
      // got a previous item; check if we want to update this item
      if (checkEventDataIsOlder(type, existingTicket?.matchmakingStatus)) {
        continue; // ignore the update for this ticket as the data in DynamoDB is newer
      }

      // Write to DynamoDB
      var matchmakingTicket: MatchmakingTicket = {
        ticketId: ticketId,
        matchmakingStatus: type,
        playerSessionId: playerSessionId,
        ttl: epochDate
      };

      if (type === MatchmakingStatus.MatchmakingSucceeded) {
        // Add connection information if we got a matchmaking success
        matchmakingTicket.ip = message.detail.gameSessionInfo.ipAddress;
        matchmakingTicket.port = message.detail.gameSessionInfo.port.toString();
        matchmakingTicket.dnsName = message.detail.gameSessionInfo.dnsName;
      }
      // Call DynamoDB to add the item to the table
      await matchmakingTicketModel.createOrUpdate(matchmakingTicket, existingTicket).then(data => {
        console.log("Success", data);
      }).catch(err => {
        console.log("Error in put item:", err);
      });
    }
  }
  callback(null, "Success");
};

const checkEventDataIsOlder = (newStatus: MatchmakingStatus, currentStatus?: MatchmakingStatus) => {
  return (newStatus === MatchmakingStatus.MatchmakingSearching && currentStatus) ||
    (newStatus === MatchmakingStatus.PotentialMatchCreated && (currentStatus !== MatchmakingStatus.PotentialMatchCreated && currentStatus !== MatchmakingStatus.MatchmakingSearching));
}


export {
  processMatchmakingEvents,
};