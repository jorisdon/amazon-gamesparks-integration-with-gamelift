# `game-client`
This repository contains a sample Unity game client that authenticates via Amazon GameSparks and connects into GameLift Real Time Server information returned by FlexMatch

# Requirements
An AWS account with access to GameLift: https://aws.amazon.com/getting-started/

Software Tools
- Microsoft Visual Studio 2017 or higher (any edition): https://visualstudio.microsoft.com/
- Unity: https://unity.com/

SDK's and Libraries
- GameLift Realtime Client SDK: https://aws.amazon.com/gamelift/getting-started/ 
- GameSparks client SDK: https://docs.aws.amazon.com/gamesparks/latest/dg/set-up.html#_install_the_gamesparks_client_sdk
- Demigiant DOTween: http://dotween.demigiant.com/

# Installing the sample
## Installing the GameLift Real Time Server SDK

1. Build the GameLift Realtime Client SDK making sure to target .Net 4.5
2. From the GameLift Client SDK add the following files to the Unity project
    - GameScaleRealTimeClientSDKNet45.dll
    - Google.Protobuf.dll
    - Log4net.dll
    - SuperSocket.ClientEngine.dll
    - WebSocket4Net.dll

## Installing the Demigiant DOTween library

1. Download DOTween from http://dotween.demigiant.com/download and unzip the file into Assets/ folder
2. Close/re-open Unity
3. Go to Tools -> Demigiant -> DOTween Utility Panel 
4. Click “Setup DOTween…”


## Installing Amazon GameSparks Client SDK

1. In Unity, go to Window -> Package Manager -> + -> Add package from tarball 
2. Select the AmazonGameSparks.tgz file
3. Go to GameSparks menu -> Setup Scene -> Create connection
4. An Assets/Amazon/GameSparks/Connection.asset appears in your project folder.
5. In GameSparks, in the navigation panel select Dev. In the Dev stage configuration section, copy the Key to your clipboard.
6. In Unity, select the Connection object, and then in the Inspector panel, in the Game Key field, paste your key.
7. Open the title scene
8. Click on Canvas
9. Drag the Connection object from the Project window onto the "Connection Scriptable Object" field in the Title Controller script

## Installing the Amazon GameSparks client code

1. In GameSparks, on the Dev page, in the Snapshot card, choose Actions, and then choose Generate code.
2. On the Generate Code for Dev Stage dialog box, make sure that Game client platform is set to Unity and that Language is set to C#.
3. Choose Generate Code.
4. After the code has been generated, choose Download. 
5. Open the .ZIP file you downloaded. 
6. Extract the MegaFrogRaceOperations.cs file.
7. In Unity, in the Project pane, browse to the GameSparks folder.
8. Right-click inside the folder and choose Import New Asset.
9. Choose MegaFrogRaceOperations.cs.

This sample code is made available under the Apache-2.0 license. See the LICENSE file.