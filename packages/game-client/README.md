# `game-client`

This repository contains a sample Unity game client that authenticates via Amazon GameSparks and connects into GameLift Realtime Server information returned by FlexMatch.

This sample code is made available under the Apache-2.0 license. See the LICENSE file.

# Requirements
An AWS account with access to GameLift: https://aws.amazon.com/getting-started/

Software Tools
- Microsoft Visual Studio 2017 or higher (any edition): https://visualstudio.microsoft.com/
- Unity: https://unity.com/

SDK's and Libraries
- GameLift Realtime Client SDK: https://aws.amazon.com/gamelift/getting-started/ 
- GameSparks client SDK: https://docs.aws.amazon.com/gamesparks/latest/dg/set-up.html#_install_the_gamesparks_client_sdk
- Demigiant DOTween: http://dotween.demigiant.com/

You must also have set up the Amazon GameSparks game backend for MegaFrogRace according to the instructions found in [the blog post that accompanies this solution](https://aws.amazon.com/blogs/gametech/building-a-multiplayer-game-with-amazon-gamesparks-and-amazon-gamelift/), and generated the client code from the AWS Management Console as per the instructions found in the blog post.

# Installing the sample

## Installing the GameLift Realtime Client SDK

1. Extract the [GameLift Realtime Client SDK](https://aws.amazon.com/gamelift/getting-started/) .zip file
2. Load up the realtime client SDK solution in Visual Studio
3. Restore the NuGet packages and build the project from Visual Studio, making sure to target .Net 4.5
4. Copy the following built files to the Unity project, which you can find in the "MegaFrogRace" folder:
    * GameScaleRealTimeClientSDKNet45.dll
    * Google.Protobuf.dll
    * Log4net.dll
    * SuperSocket.ClientEngine.dll
    * WebSocket4Net.dll

## Installing the Demigiant DOTween library

1. Extract the DOTween package, which you can [download from the Demigiant website](http://dotween.demigiant.com/download), and copy the extracted folder to the Assets folder in the Unity project.
2. (re-)open Unity and load the MegaFrogRace project. If you see any build errors in the console, you can ignore these at this point.
3. Go to _Tools_ → _Demigiant_ → _DOTween Utility Panel_ and select _Setup DOTween…_

## Installing Amazon GameSparks Client SDK plugin

1. In Unity, go to _Window_ -> _Package Manager_ -> _+_ -> _Add package from tarball_
2. Select the _AmazonGameSparks.tgz_ file, which you can download from [here](https://docs.aws.amazon.com/gamesparks/latest/dg/set-up.html#_install_the_gamesparks_client_sdk).
3. The Amazon GameSparks client SDK should now be installed!

## Loading the generated GameSparks Client Code into the project

1. Extract the Amazon GameSparks Client Code .zip file that you generated from the AWS Management Console.
2. In Unity, in the _Project pane_, browse to the GameSparks folder.
3. Right-click inside the folder and select _Import New Asset_.
4. Select the _MegaFrogRaceOperations.cs_ file from the extracted Client Code.

## Setting up the GameSparks connection

1. On the AWS Management Console, navigate to the Amazon GameSparks console, then navigate to _MegaFrogRace’s Dev stage_. Under _Dev stage configuration_, you should see a _Key_; copy this to your clipboard for later.
2. In Unity, go to _GameSparks menu_ → _Setup Scene_ → _Create connection_. An _Assets/Amazon/GameSparks/Connection.asset_ should appear in your project folder.
3. Select the Connection object, and then in the _Inspector panel_, in the _Game Key field_, paste the key we copied earlier.
4. Open the title scene, click on _Canvas_, then drag the _Connection object_ from the _Project window_ onto the _“Connection Scriptable Object”_ field in the _Title Controller_ script. The Amazon GameSparks Client SDK is now set up and connected with your GameSparks backend.
