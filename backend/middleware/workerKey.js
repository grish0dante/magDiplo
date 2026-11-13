const crypto=require('crypto');
module.exports=(req,res,next)=>{
 const secret=process.env.WORKER_SECRET;
 if(!secret)return res.status(503).json({error:'Worker secret not configured'});
 const supplied=req.get('x-worker-secret')||'';
 const a=Buffer.from(secret),b=Buffer.from(supplied);
 if(a.length!==b.length || !crypto.timingSafeEqual(a,b))return res.sendStatus(403);
 next();
};
