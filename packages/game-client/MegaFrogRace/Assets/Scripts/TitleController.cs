// Copyright 2019 Amazon.com, Inc. or its affiliates. All Rights Reserved.
// SPDX-License-Identifier: Apache-2.0

using System;
using System.Collections;
using UnityEngine;
using UnityEngine.SceneManagement;
using RTSGame;
using System.Net;
using Amazon.GameSparks.Unity.DotNet;
using Amazon.GameSparks.Unity.Editor.Assets;
using Amazon.GameSparks.Unity.Generated;
using UnityEngine.UI;

public class TitleController : MonoBehaviour
{
    [SerializeField]
    public GameObject progressPanel;

    [SerializeField]
    private ConnectionScriptableObject connectionScriptableObject = default;

    private ProgressPanelController _progressPanelController;
    public float pollFrequency = 5f;
    private IEnumerator _pollCoroutine=null;
    
    // Start is called before the first frame update
    void Start()
    {
        _progressPanelController = progressPanel.GetComponent<ProgressPanelController>();
    }

    // Update is called once per frame
    void Update()
    {
        
    }

    public void StartMatchmaking()
    {
        progressPanel.SetActive(true);
        
        _progressPanelController.SetTitle("Connecting...");
        _progressPanelController.SetDebugText("");
        
        var mmRequest = new MegaFrogRaceOperations.StartMatchmakingRequest();
        try
        {
            Debug.Log("Sending StartMatchmaking request");
            connectionScriptableObject.Connection.EnqueueStartMatchmakingRequest(
                mmRequest,
                HandleStartMatchmakingResponse,
                error => { Debug.Log("Request failed: " + error); },
                () => { Debug.Log("Request timed out."); },
                TimeSpan.FromMinutes(2));
        }
        catch (Exception e)
        {
            Debug.LogException(e);
        }
    }

    public void ClosePanel()
    {
        StopMatchmaking();
        progressPanel.SetActive(false);
    }

    public void StopMatchmaking()
    {
        if (_pollCoroutine != null)
        {
            StopCoroutine(_pollCoroutine);
        }
    }

    public void StartCheckMatchmaking()
    {
        if (_pollCoroutine!=null)
        {
            StopCoroutine(_pollCoroutine);
        }
        _pollCoroutine = CheckMatchmaking();
        StartCoroutine(_pollCoroutine);
    }
    private IEnumerator CheckMatchmaking()
    {
        while (true)
        {
            var mmRequest = new MegaFrogRaceOperations.GetMatchmakingInfoRequest();
            try
            {
                Debug.Log("Sending GetMatchmakingInfo Request");
                connectionScriptableObject.Connection.EnqueueGetMatchmakingInfoRequest(
                    mmRequest,
                    HandleGetMatchmakingInfoResponse,
                    error => { Debug.Log("Request failed: " + error); },
                    () => { Debug.Log("Request timed out."); },
                    TimeSpan.FromMinutes(2));
            }
            catch (Exception e)
            {
                Debug.LogException(e);
            }
            
            yield return new WaitForSeconds(pollFrequency);
        }
    }

    private void HandleStartMatchmakingResponse(Message<MegaFrogRaceOperations.StartMatchmakingResponse> response)
    {
        _progressPanelController.SetTitle("Ticket ID: " + response.Payload.TicketId);
        _progressPanelController.SetDebugText(response.Payload.ToString());
        StartCheckMatchmaking();
    }
    
    private void HandleGetMatchmakingInfoResponse(Message<MegaFrogRaceOperations.GetMatchmakingInfoResponse> response)
    {
        _progressPanelController.SetDebugText(response.Payload.ToString());
        switch (response.Payload.Status)
        {
            case MegaFrogRaceOperations.MatchmakingStatus.MatchmakingSucceeded:
                StateManager.ConnectionInfo = response.Payload.ConnectionInfo;
                StopMatchmaking();
                StartCoroutine(LoadGameScene());
                break;
            
            case MegaFrogRaceOperations.MatchmakingStatus.MatchmakingCancelled:
            case MegaFrogRaceOperations.MatchmakingStatus.MatchmakingFailed:
            case MegaFrogRaceOperations.MatchmakingStatus.MatchmakingTimedOut:
                StopMatchmaking();
                break;
        }
    }
    
    private IEnumerator LoadGameScene()
    {
        var asyncLoad = SceneManager.LoadSceneAsync("game");
        while (!asyncLoad.isDone)
        {
            yield return null;
        }
    }
}
