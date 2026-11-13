// Restricted arithmetic parser. Never evaluates arbitrary JavaScript.
const functions = Object.freeze({sin:Math.sin,cos:Math.cos,tan:Math.tan,sqrt:Math.sqrt,abs:Math.abs,exp:Math.exp,log:Math.log,pow:Math.pow,min:Math.min,max:Math.max});
const constants = Object.freeze({PI:Math.PI,E:Math.E});
function compileFormula(input) {
  const source=String(input||'x*x+y*y+z*z-64');
  if(source.length>240) throw Error('Formula is too long (max 240 characters)');
  const tokens=[]; const re=/\s*([A-Za-z_][A-Za-z_0-9]*|(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?|[()+\-*/^,])/y;
  let i=0;
  while(i<source.length){re.lastIndex=i;const m=re.exec(source);if(!m)throw Error(`Unexpected character at position ${i+1}`);tokens.push(m[1]);i=re.lastIndex;if(tokens.length>200)throw Error('Formula is too complex');}
  let at=0;const peek=()=>tokens[at];const take=(t)=>peek()===t?(at++,true):false;
  function primary(){
    if(take('(')){const expr=add();if(!take(')'))throw Error('Missing closing parenthesis');return expr;}
    const t=tokens[at++];if(t===undefined)throw Error('Incomplete expression');
    if(/^(?:\d|\.)/.test(t)){const n=Number(t);return ()=>n;}
    if(/^[A-Za-z_]/.test(t)){
      if(t==='x'||t==='y'||t==='z')return (v)=>v[t];
      if(Object.hasOwn(constants,t))return ()=>constants[t];
      if(Object.hasOwn(functions,t)){
        if(!take('('))throw Error(`Function ${t} requires parentheses`);
        const args=[];if(!take(')')){do{args.push(add());}while(take(','));if(!take(')'))throw Error('Missing closing parenthesis');}
        if((t==='pow'&&args.length!==2)||(['min','max'].includes(t)&&args.length<1)||(!['pow','min','max'].includes(t)&&args.length!==1))throw Error(`Invalid argument count for ${t}`);
        return v=>functions[t](...args.map(a=>a(v)));
      }
      throw Error(`Unknown name: ${t}`);
    }
    throw Error(`Unexpected token: ${t}`);
  }
  function power(){let left=primary();if(take('^')){const right=unary();const old=left;left=v=>Math.pow(old(v),right(v));}return left;}
  function unary(){if(take('+'))return unary();if(take('-')){const a=unary();return v=>-a(v);}return power();}
  function mul(){let left=unary();while(peek()==='*'||peek()==='/'){const op=tokens[at++],a=left,b=unary();left=op==='*'?v=>a(v)*b(v):v=>a(v)/b(v);}return left;}
  function add(){let left=mul();while(peek()==='+'||peek()==='-'){const op=tokens[at++],a=left,b=mul();left=op==='+'?v=>a(v)+b(v):v=>a(v)-b(v);}return left;}
  const fn=add();if(at!==tokens.length)throw Error(`Unexpected token: ${peek()}`);
  return fn;
}
function buildFormulaField(formula){const fn=compileFormula(formula);return(x,y,z)=>{const value=fn({x,y,z});return Number.isFinite(value)?value:1e30;};}
module.exports={buildFormulaField,compileFormula};
