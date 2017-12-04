const fs = require('fs');
const Koa = require('koa');
const Router = require('koa-router');
const websockify = require('koa-websocket')
const uuidv4 = require('uuid/v4')
const app = new Koa();
const router = new Router();
const wsRouter = new Router();


let CONN = {}

function addConnection(id, uuid, ws) {
  if (!CONN[id]) {
    CONN[id] = {
      [uuid]: ws
    }
  } else if (!CONN[id][uuid]) {
    CONN[id][uuid] = ws
  }
}

function removeConnection(id, uuid) {
  if (CONN[id]) {
    CONN[id][uuid] = null
    delete CONN[id][uuid]
  }
}

function okRes(data){
  return JSON.stringify({
    code: 0,
    msg: 'ok',
    data: data
  })
}

function errRes(code, msg) {
  return JSON.stringify({
    code: code,
    msg: msg
  })
}

router.get('/', function(ctx, next){
  ctx.body = 'It works!'
})

router.get('/collect', function(ctx, next){
  const id = ctx.request.query.id
  const msg = ctx.request.query.msg
  if(CONN[id]) {
    Object.keys(CONN[id]).forEach((key) => {
      CONN[id][key].send(msg)
    })
  }
  ctx.body = okRes({
    success: true
  }) 
})

router.get('/show', function(ctx, next){
  const str = fs.readFileSync('./index.html')
  ctx.set('content-type', 'text/html')
  ctx.body = str
})

router.get('*', function(ctx, next){
  ctx.body = '404'
})

app.use(router.routes())
  .use(router.allowedMethods());

wsRouter.get('/ws', function(ctx, next){
  const id = ctx.request.query.id
  const uuid = uuidv4()
  const msg = id ? 'welcome!' : '请设置id参数。如localhost:3000/ws?id=abc123'

  ctx.websocket.send(msg);
  if (id) {
    addConnection(id, uuid, ctx.websocket)
    ctx.websocket.on('close', function () {
      removeConnection(id, uuid)
    })
  }
})

websockify(app);
app.ws
  .use(wsRouter.routes())
  .use(wsRouter.allowedMethods())

app.listen(3000);
