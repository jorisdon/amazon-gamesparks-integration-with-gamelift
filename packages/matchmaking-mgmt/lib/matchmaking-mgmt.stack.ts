import { join as pathJoin } from 'path';
import {CfnOutput, Duration, Stack, StackProps} from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {AttributeType} from 'aws-cdk-lib/aws-dynamodb';
import {DynamoTable, LambdaFunction} from 'project-constructs';
import {SnsEventSource} from 'aws-cdk-lib/aws-lambda-event-sources';
import {Topic} from 'aws-cdk-lib/aws-sns';
import {PolicyStatement, ServicePrincipal, Effect, Role} from 'aws-cdk-lib/aws-iam';
import {Key} from 'aws-cdk-lib/aws-kms';
import {NagSuppressions} from 'cdk-nag';

export interface MatchmakingMgmtStackProps extends StackProps {
  readonly matchmakingTopicArn: string;
  readonly matchmakingConfigurationArn: string;
}

/** CDK Stack containing Matchmaking management infrastructure. */
export class MatchmakingMgmtStack extends Stack {

  /** CloudFormation outputs */
  public readonly matchmakingTicketTableArn: CfnOutput;
  public readonly matchmakingTicketTableName: CfnOutput;
  public readonly gameSparksRoleArn: CfnOutput;

  constructor(scope: Construct, id: string, props: MatchmakingMgmtStackProps) {
    super(scope, id, props);

    const cloudWatchAccessPolicy = new PolicyStatement({
      actions: [
        'logs:CreateLogGroup',
        'logs:CreateLogStream',
        'logs:PutLogEvents',
        'xray:PutTraceSegments',
        'xray:PutTelemetryRecords',
      ],
      resources: ['*']
    });

    // ** DYNAMODB TABLES **
    const matchmakingTicketsTable = new DynamoTable(this, 'MatchmakingTicket', {
      tableName: 'MatchmakingTicket',
      partitionKey: {
        name: 'ticketId',
        type: AttributeType.STRING,
      },
      timeToLiveAttribute: 'ttl'
    });

    const matchmakingTopic = Topic.fromTopicArn(this, 'MatchmakingTopic', props.matchmakingTopicArn);

    // ** Consumers
    const processMatchmakingEventsRole = new Role(this, 'ProcessMatchmakingEventsRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
    });
    processMatchmakingEventsRole.addToPrincipalPolicy(cloudWatchAccessPolicy);
    NagSuppressions.addResourceSuppressions(
      processMatchmakingEventsRole,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: "Suppress IAM Wildcard finding for CloudWatch default lambda policy"
        },
      ],
      true
    );
    const processMatchmakingEventsFunction = new LambdaFunction(this, 'ProcessMatchmakingEventFunction', {
      entry: pathJoin(__dirname, '../src/handlers/process-matchmaking-events.handler.js'),
      handler: 'processMatchmakingEvents',
      environment: {
        MATCHMAKING_TICKET_TABLE_NAME: matchmakingTicketsTable.tableName,
        POWERTOOLS_SERVICE_NAME: 'processMatchmakingEvents'
      },
      role: processMatchmakingEventsRole,
    });
    processMatchmakingEventsFunction.addEventSource(new SnsEventSource(matchmakingTopic));

    const requestMatchmakingRole = new Role(this, 'RequestMatchmakingRole', {
      assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
    });
    requestMatchmakingRole.addToPrincipalPolicy(cloudWatchAccessPolicy);
    requestMatchmakingRole.addToPrincipalPolicy(new PolicyStatement({
      actions: [
        'gamelift:StartMatchmaking',
      ],
      resources: [ "*" ]
    }));
    NagSuppressions.addResourceSuppressions(
      requestMatchmakingRole,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: "Suppress IAM Wildcard finding as Gamelift StartMatchmaking does not support resource-level permissions"
        },
      ],
      true
    );

    const requestMatchmakingFunction = new LambdaFunction(this, 'RequestMatchmakingFunction', {
      entry: pathJoin(__dirname, '../src/handlers/request-matchmaking.handler.js'),
      handler: 'requestMatchmaking',
      environment: {
        MATCHMAKING_CONFIGURATION_NAME: props.matchmakingConfigurationArn,
        POWERTOOLS_SERVICE_NAME: 'requestMatchmaking'
      },
      role: requestMatchmakingRole,
    });
    // Assign permission for matchmaking ticket table
    matchmakingTicketsTable.grantReadWriteData(processMatchmakingEventsFunction);

    const gameSparksRole = new Role(this, 'GameDeployment-MegaFrogRace', {
      assumedBy: new ServicePrincipal('gamesparks.amazonaws.com'),
      roleName: 'GameDeployment-MegaFrogRace'
    });
    // Policy statement to allow read-only access
    gameSparksRole.addToPrincipalPolicy(new PolicyStatement({
      actions: [
        'dynamodb:GetItem',
        'dynamodb:Query'
      ],
      resources: [matchmakingTicketsTable.tableArn],
    }));
    // Create a policy to allow invoking the function - used for GameSparks later
    gameSparksRole.addToPrincipalPolicy(new PolicyStatement({
      actions: [
        'lambda:InvokeFunction'
      ],
      resources: [requestMatchmakingFunction.functionArn],
    }));
    gameSparksRole.addToPrincipalPolicy(new PolicyStatement({
      sid: 'ContainerInvokeBackend',
      actions: [
        'gamesparks:InvokeBackend'
      ],
      resources: [`arn:aws:gamesparks:${this.region}:${this.account}:game/MegaFrogRace/stage/Dev`] // Note: change this if you use a different name or stage for your game!
    }));
    gameSparksRole.addToPrincipalPolicy(new PolicyStatement({
      sid: 'ContainerPutLogEvent',
      actions: [
        'logs:PutLogEvents',
        'logs:CreateLogStream',
        'logs:CreateLogGroup'
      ],
      resources: [`arn:aws:logs:${this.region}:${this.account}:log-group:/aws/gamesparks/*`]
    }));
    NagSuppressions.addResourceSuppressions(
      gameSparksRole,
      [
        {
          id: 'AwsSolutions-IAM5',
          reason: "Suppress IAM Wildcard finding for CloudWatch logGroup permissions"
        },
      ],
      true
    );

    this.matchmakingTicketTableArn = new CfnOutput(this, 'MatchmakingTicketsTableArn', {
      value: matchmakingTicketsTable.tableArn,
    });
    this.matchmakingTicketTableName = new CfnOutput(this, 'MatchmakingTicketsTableName', {
      value: matchmakingTicketsTable.tableName,
    });
    this.gameSparksRoleArn = new CfnOutput(this, 'GameSparksRoleArn', {
      value: gameSparksRole.roleArn
    });
  }

}