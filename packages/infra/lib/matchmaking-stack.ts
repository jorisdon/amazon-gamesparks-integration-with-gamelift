import {CfnOutput, Stack, StackProps} from 'aws-cdk-lib';
import {Construct} from 'constructs/lib';
import {Topic, TopicPolicy} from 'aws-cdk-lib/aws-sns';
import {AnyPrincipal, Effect, PolicyDocument, PolicyStatement, Role, ServicePrincipal} from 'aws-cdk-lib/aws-iam';
import {
  CfnAlias,
  CfnFleet,
  CfnGameSessionQueue,
  CfnMatchmakingConfiguration,
  CfnMatchmakingRuleSet,
  CfnScript
} from 'aws-cdk-lib/aws-gamelift';
import {Bucket} from 'aws-cdk-lib/aws-s3';
import {Key} from 'aws-cdk-lib/aws-kms';
import {NagSuppressions} from 'cdk-nag';

export interface MatchmakingStackProps extends StackProps {
  readonly assetBucketName: string;
  readonly assetObjectKey: string;
}

/** CDK Stack containing Matchmaking infrastructure. */
export class MatchmakingStack extends Stack {

  public snsKey: CfnOutput;
  public matchmakingConfigArn: CfnOutput;
  public matchmakingConfigName: CfnOutput;
  public gameSessionQueueArn: CfnOutput;
  public matchmakingTopicArn: CfnOutput;

  constructor(scope: Construct, id: string, props: MatchmakingStackProps) {
    super(scope, id, props);

    const topic = new Topic(this, 'MatchmakingNotificationTopic', {
      displayName: 'Matchmaking Notification topic',
    });
    NagSuppressions.addResourceSuppressions(
      topic,
      [
        {
          id: 'AwsSolutions-SNS2',
          reason: "Suppress finding as Amazon GameLift cannot publish to an Encrypted Topic - no permission assigned to a Matchmaking configuration to use KMS Key"
        },
      ],
      true
    );

    //Enforce SSL when subscribing / consuming SNS Topic
    const topicPolicy = new TopicPolicy(this, 'MatchmakingTopicPolicy', {
      topics: [ topic ],
      policyDocument: new PolicyDocument({
        assignSids: true,
        statements: [
          new PolicyStatement({
            actions: [
              'sns:Publish'
            ],
            principals: [new ServicePrincipal('gamelift.amazonaws.com')],
            resources: [topic.topicArn],
          }),
          new PolicyStatement({
            actions: [
              'sns:Publish'
            ],
            effect: Effect.DENY,
            principals: [new AnyPrincipal()],
            resources: [topic.topicArn],
            conditions: {
              'Bool': {
                'aws:SecureTransport': 'false'
              }
            }
          }),
        ],
      })
    });

    // ### Realtime server script asset
    const assetBucket = Bucket.fromBucketName(this, 'Asset Bucket', props.assetBucketName);

    const scriptAccessRole = new Role(this, 'GameServerScriptAccessRole', {
      assumedBy: new ServicePrincipal('gamelift.amazonaws.com'),
    });

    scriptAccessRole.addToPrincipalPolicy(new PolicyStatement({
      actions: [
        's3:GetObject',
        's3:GetObjectVersion'
      ],
      resources: [`${assetBucket.bucketArn}/${props.assetObjectKey}`]
    }));

    // ### Gamelift Fleet components
    const script = new CfnScript(this, 'GameServerScript', {
      name: `${this.stackName}`,
      version: '1.0',
      storageLocation: {
        bucket: props.assetBucketName,
        key: props.assetObjectKey,
        roleArn: scriptAccessRole.roleArn,
      }
    });
    script.node.addDependency(scriptAccessRole);

    const fleet = new CfnFleet(this, 'RealtimeFleet', {
      name: 'SampleRealtimeFleet',
      scriptId: script.attrId,
      certificateConfiguration: {
        certificateType: 'GENERATED'
      },
      metricGroups: ['default'],
      description: 'An example realtime server fleet',
      ec2InstanceType: 'c4.large',
      fleetType: 'ON_DEMAND',
      locations: [{
        location: this.region, // deployment region is us-east-1 for Gamesparks preview access
      }],
      newGameSessionProtectionPolicy: 'FullProtection',
      runtimeConfiguration: {
        gameSessionActivationTimeoutSeconds: 300,
        serverProcesses: [{
          concurrentExecutions: 1,
          launchPath: '/local/game/index.js',
          parameters: 'loggingLevel:debug'
        }]
      }
    });
    fleet.node.addDependency(script);

    // Alias that references the fleet
    // This is not required as we're registering to a Queue but just here for example
    // If you target Fleets directly, then Aliases are useful for replacing Fleets.
    const fleetAlias = new CfnAlias(this, 'FleetAlias', {
      name: 'SampleGameServerFleetAlias',
      routingStrategy: {
        type: 'SIMPLE',
        fleetId: fleet.attrFleetId,
      },
      // the properties below are optional
      description: 'An alias routing traffic to the fleet'
    });

    const gameSessionQueue = new CfnGameSessionQueue(this, 'GameSessionQueue', {
      name: 'MyGameSessionQueue',
      destinations: [ {
        destinationArn: `arn:aws:gamelift:${this.region}::alias/${fleetAlias.attrAliasId}`
      }],
      timeoutInSeconds: 50
    });

    // ### MatchMaking rules components
    var ruleSet = new CfnMatchmakingRuleSet(this, 'MatchmakingRuleSet', {
      name: 'SampleRuleSet',
      ruleSetBody: JSON.stringify({
        name: 'SimpleRule',
        ruleLanguageVersion: '1.0',
        teams: [{
          name: 'oneteam',
          minPlayers: 2,
          maxPlayers: 2
        }]
      })
    });

    var flexMatchConfig = new CfnMatchmakingConfiguration(this, 'MatchmakingConfig', {
      name: 'SampleMatchmakingConfig',
      description: 'A basic matchmaking configuration that matched 2 players based on latency',
      acceptanceRequired: false,
      requestTimeoutSeconds: 25,
      additionalPlayerCount: 0,
      backfillMode: 'AUTOMATIC',
      gameProperties: [],
      gameSessionQueueArns : [ gameSessionQueue.attrArn ],
      notificationTarget: topic.topicArn,
      ruleSetName : ruleSet.name,
    });

    this.matchmakingTopicArn = new CfnOutput(this, 'MatchmakingTopicArn', {
      value: topic.topicArn
    });
    this.gameSessionQueueArn = new CfnOutput(this, 'GameSessionQueueArn', {
      value: gameSessionQueue.attrArn
    });
    this.matchmakingConfigArn = new CfnOutput(this, 'MatchmakingConfigurationArn', {
      value: flexMatchConfig.attrArn
    });
    this.matchmakingConfigName = new CfnOutput(this, 'MatchmakingConfigurationName', {
      value: flexMatchConfig.attrName
    });
  }
}
