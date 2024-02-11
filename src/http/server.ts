import fastify from 'fastify'
import websocket from '@fastify/websocket'
import cookie from '@fastify/cookie'
import { createPoll } from './routes/poll/create'
import { getPoll } from './routes/poll/get-poll'
import { voteOnPoll } from './routes/poll/vote'
import { pollResults } from './ws/poll-results'

const app = fastify()

app.register(cookie, {
  secret: "poll-vote-service",
  hook: 'onRequest', // Set to false to disable cookie autoparsing or set autoparsing on any of the following hooks: 'onRequest', 'preParsing', 'preHandler', 'preValidation'. default: 'onRequest'
})

app.register(websocket) // Websocket init

// WS requests
app.register(pollResults)

// HTTP requests
app.register(createPoll)
app.register(getPoll)
app.register(voteOnPoll)

app.listen({ port: 3333 }).then(() => {
  console.log('HTTP server running bro!');
});