import { NodejsFunction, NodejsFunctionProps } from 'aws-cdk-lib/aws-lambda-nodejs';
import { Alarm, GraphWidget, IWidget, Metric, TreatMissingData } from 'aws-cdk-lib/aws-cloudwatch';
import { RetentionDays } from 'aws-cdk-lib/aws-logs';
import { Alias, Architecture, LambdaInsightsVersion, Runtime, Tracing } from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';
import { Duration, RemovalPolicy } from 'aws-cdk-lib';

export interface LambdaFunctionProps extends NodejsFunctionProps {
  /* Threshold for the duration alarm, in milliseconds. */
  readonly durationThreshold?: number;
}

/**
 * NodeJS Lambda function with project defaults, monitoring...
 */
export class LambdaFunction extends NodejsFunction {
  public readonly errorAlarm: Alarm;
  public readonly durationWarning: Alarm;
  public readonly liveAlias: Alias;
  public readonly errorWidget: IWidget;

  constructor(scope: Construct, id: string, props: LambdaFunctionProps) {
    super(scope, id, {
      currentVersionOptions: {
        removalPolicy: RemovalPolicy.RETAIN, // retain old versions
        retryAttempts: 1, // async retry attempts
      },
      functionName: id,
      tracing: Tracing.ACTIVE,
      memorySize: 512,
      runtime: Runtime.NODEJS_16_X,
      retryAttempts: 2,
      timeout: Duration.seconds(3),
      logRetention: RetentionDays.TEN_YEARS,
      architecture: Architecture.ARM_64,
      insightsVersion: LambdaInsightsVersion.VERSION_1_0_119_0,
      ...props,
    });

    this.liveAlias = this.addAlias('live');

    this.errorAlarm = new Alarm(scope, `${id}ErrorAlarm`, {
      metric: this.metricErrors(),
      threshold: 1,
      evaluationPeriods: 1,
      treatMissingData: TreatMissingData.NOT_BREACHING,
    });

    this.durationWarning = new Alarm(scope, `${id}DurationWarning`, {
      metric: this.metricDuration({ statistic: 'p90', period: Duration.minutes(1) }),
      threshold: props.durationThreshold || 2000,
      evaluationPeriods: 3,
      treatMissingData: TreatMissingData.NOT_BREACHING,
    });

    // Build Ops Widget
    this.errorWidget = new GraphWidget({
      width: 12,
      height: 6,
      title: this.functionName,
      left: [
        new Metric({
          namespace: 'AWS/Lambda',
          metricName: 'Errors',
          statistic: 'Sum',
          period: Duration.seconds(300),
          dimensionsMap: { FunctionName: this.functionName },
        }),
      ],
    });
  }
}
