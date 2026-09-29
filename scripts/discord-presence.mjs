// A small Gateway session for the bot's online indicator. Message delivery
// still uses the independent HTTP outbox worker.
const wait=(ms,signal)=>new Promise(resolve=>{
  if(signal.aborted)return resolve();
  const timer=setTimeout(done,ms);
  function done(){clearTimeout(timer);signal.removeEventListener('abort',done);resolve();}
  signal.addEventListener('abort',done,{once:true});
});

async function gatewayUrl(token) {
  const response=await fetch('https://discord.com/api/v10/gateway/bot',{
    headers:{authorization:`Bot ${token}`},signal:AbortSignal.timeout(15000),
  });
  if(!response.ok)throw new Error(`Gateway discovery HTTP ${response.status}`);
  const data=await response.json();
  if(!data.url?.startsWith('wss://'))throw new Error('Invalid Discord Gateway URL');
  return data.url;
}

function connect(url,token,session,signal) {
  return new Promise(resolve=>{
    const address=new URL(url);
    address.searchParams.set('v','10');
    address.searchParams.set('encoding','json');
    const socket=new WebSocket(address);
    let timer;
    let heartbeat;
    let firstHeartbeat;
    let acknowledged=true;
    let sequence=session?.sequence??null;
    let currentSession=session;
    let finished=false;

    const send=(op,d)=>{
      if(socket.readyState===WebSocket.OPEN)socket.send(JSON.stringify({op,d}));
    };
    const beat=()=>{
      if(!acknowledged){
        // A missing ACK means the connection is stale. Discord will permit a resume.
        socket.close(4000,'Missed heartbeat');
        return;
      }
      acknowledged=false;
      send(1,sequence);
    };
    const stop=()=>{
      if(finished)return;
      finished=true;
      clearTimeout(timer);
      clearTimeout(firstHeartbeat);
      clearInterval(heartbeat);
      signal.removeEventListener('abort',abort);
    };
    const abort=()=>{
      if(socket.readyState===WebSocket.OPEN)socket.close(1000,'Worker stopping');
      else {try{socket.close();}catch{ /* Connection still opening. */ }}
      stop();
      resolve({session:null,code:1000});
    };
    signal.addEventListener('abort',abort,{once:true});
    timer=setTimeout(()=>{
      if(!finished){try{socket.close(4000,'Gateway timeout');}catch{ /* Opening. */ }}
    },30000);
    socket.addEventListener('message',event=>{
      let packet;
      try{packet=JSON.parse(event.data);}catch{return;}
      if(packet.s!==null&&packet.s!==undefined)sequence=packet.s;
      if(packet.op===10){
        clearTimeout(timer);
        const interval=Number(packet.d?.heartbeat_interval);
        if(!Number.isFinite(interval)||interval<1000){socket.close(4000,'Invalid heartbeat');return;}
        firstHeartbeat=setTimeout(()=>{
          beat();
          heartbeat=setInterval(beat,interval);
        },Math.floor(Math.random()*interval));
        if(currentSession?.id){
          send(6,{token,session_id:currentSession.id,seq:sequence});
        } else {
          send(2,{token,intents:0,
            properties:{os:'linux',browser:'migu-partyfinder',device:'migu-partyfinder'},
            presence:{status:'online',since:null,afk:false,
              activities:[{name:"raids on Migu's Partyfinder",type:3}]},
          });
        }
      } else if(packet.op===11){
        acknowledged=true;
      } else if(packet.op===1){
        send(1,sequence);
      } else if(packet.op===0 && packet.t==='READY'){
        currentSession={id:packet.d.session_id,url:packet.d.resume_gateway_url,sequence};
        console.info('Discord presence online');
      } else if(packet.op===0 && packet.t==='RESUMED'){
        console.info('Discord presence resumed');
      } else if(packet.op===9){
        if(!packet.d)currentSession=null;
        socket.close(4000,'Invalid session');
      } else if(packet.op===7){
        socket.close(4000,'Reconnect requested');
      }
    });
    socket.addEventListener('error',()=>{
      // Close event handles reconnect; never log a URL or token here.
    });
    socket.addEventListener('close',event=>{
      stop();
      resolve({session:currentSession?{...currentSession,sequence}:null,code:event.code});
    });
  });
}

export async function runDiscordPresence(token,signal) {
  let url;
  let session=null;
  let delay=5000;
  while(!signal.aborted){
    try {
      url??=await gatewayUrl(token);
      const outcome=await connect(session?.url??url,token,session,signal);
      if(signal.aborted)return;
      if([4004,4010,4013,4014].includes(outcome.code)){
        console.error('Discord presence disabled: Gateway rejected the bot session',outcome.code);
        return;
      }
      session=outcome.code===4009?null:outcome.session;
      if(outcome.code===4009)url=null;
      delay=session?5000:Math.min(60000,delay*2);
    } catch(error) {
      console.warn('Discord presence reconnect scheduled',error.message);
      delay=Math.min(60000,delay*2);
      url=null;
    }
    await wait(delay+Math.floor(Math.random()*1000),signal);
  }
}
