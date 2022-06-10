using UnityEngine;
using UnityEngine.UI;

public class ProgressPanelController : MonoBehaviour
{
    [SerializeField]
    private Text titleText;
    
    [SerializeField]
    private Text debugText;
    
    [SerializeField]
    private Text timeText;
    
    // Start is called before the first frame update
    void Start()
    {
    }

    // Update is called once per frame
    void Update()
    {
        
    }

    public void SetTitle(string titleTextStr)
    {
        titleText.text = titleTextStr;
    }
    
    public void SetDebugText(string debugTextStr)
    {
        debugText.text = debugTextStr;
        UpdateTimeText();
    }

    public void UpdateTimeText()
    { 
        timeText.text = System.DateTime.Now.ToLongTimeString();
    }

}
