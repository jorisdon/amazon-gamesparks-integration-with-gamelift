// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0
import {GameLift} from 'aws-sdk';
import { Logger } from '@aws-lambda-powertools/logger';
import { Tracer } from '@aws-lambda-powertools/tracer';

const MATCHMAKING_CONFIGURATION_NAME = process.env.MATCHMAKING_CONFIGURATION_NAME || '';

const logger = new Logger();
const tracer = new Tracer();

const gameLift = tracer.captureAWSClient(new GameLift());
/**
 * RequestMatchmaking
 * Handler to request a new matchmaking
 */
const requestMatchmaking = async (event: any) => {
  // Get player information from context
  let response;
  // Use the request gamesparks player id as the ID
  let playerId  = event.currentPlayerId;
  //Params for the matchmaking request
  var params = {
    ConfigurationName: MATCHMAKING_CONFIGURATION_NAME,
    Players: [
      {
        PlayerId: playerId
      }
    ]
  };

  // Request matchmaking
  await gameLift.startMatchmaking(params).promise().then(data => {
    response = data;
  }).catch(err => {
    logger.error(err);
  });

  //Return response if we got one
  if(response == null) {
    return {
      "body": JSON.stringify({
        message: "Unable to do matchmaking"
      }),
    };
  }
  return response;
};

export {
  requestMatchmaking
};