
import React,{useEffect,useState} from "react";
import axios from "axios";

function RiskPanel(){

 const[risk,setRisk]=useState(null);

 useEffect(()=>{
  axios.post("http://localhost:8080/api/predict",{
   latitude:12.97,
   longitude:77.59,
   hour:22
  }).then(res=>setRisk(res.data));
 },[]);

 return(
  <div>
   <h2>Risk Analysis</h2>
   {risk &&
   <div>
   <p>Risk Score: {risk.risk_score}</p>
   <p>Risk Level: {risk.risk_level}</p>
   </div>
   }
  </div>
 );
}

export default RiskPanel;
