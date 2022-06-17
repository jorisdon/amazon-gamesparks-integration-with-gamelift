import {Aspects, Stage, StageProps, Stack} from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {MatchmakingStack} from './matchmaking-stack';
import {MatchmakingMgmtStack} from 'matchmaking-mgmt';
import {AwsSolutionsChecks, NagSuppressions} from 'cdk-nag';

export interface InfraStageProps extends StageProps {
  readonly projectName: string;
  readonly terminationProtection?: boolean;
  readonly assetBucketName: string;
  readonly assetObjectKey: string;
}

export class InfraStage extends Stage {

  constructor(scope: Construct, id: string, props: InfraStageProps) {
    super(scope, id, props);

    const securityCheckConfig = {
      verbose: true,
      report: true
    };

    const matchmakingStack = new MatchmakingStack(this, 'MatchmakingStack', {
      terminationProtection: props.terminationProtection,
      assetBucketName: props.assetBucketName,
      assetObjectKey: props.assetObjectKey
    });

    const matchmakingMgmtStack = new MatchmakingMgmtStack(this, 'MatchmakingMgmtStack', {
      matchmakingConfigurationArn: matchmakingStack.matchmakingConfigArn.value,
      matchmakingTopicArn: matchmakingStack.matchmakingTopicArn.value,
    });

    // Security checks
    Aspects.of(matchmakingStack).add(new AwsSolutionsChecks({
      verbose: true,
      reports: true,
    }));

    // Security checks
    Aspects.of(matchmakingMgmtStack).add(new AwsSolutionsChecks({
      verbose: true,
      reports: true
    }));
  }
}
