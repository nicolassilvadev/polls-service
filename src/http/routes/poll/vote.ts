import { z } from "zod";
import { prisma } from "../../../lib/prisma";
import { randomUUID } from "node:crypto";
import { FastifyInstance } from "fastify";
import { redis } from "../../../lib/redis";
import { voting } from "../../../utils/voting-pub-sub";

export async function voteOnPoll(app: FastifyInstance) {
  app.post('/polls/:pollId/votes', async (req, res) => {
    // Validate param
    const voteOnPollParams = z.object({
      pollId: z.string().uuid(),
    })
    // Validate payload
    const voteOnPollBody = z.object({
      pollOptionId: z.string().uuid(),
    })
    // Get validated data
    const { pollId } = voteOnPollParams.parse(req.params)
    const { pollOptionId } = voteOnPollBody.parse(req.body)
    // Get users session id via cookie
    let { sessionId } = req.cookies
    // If sessionId comes
    if (sessionId) {
      // Find out if user already voted before at this same poll
      const userPreviousVoteOnPoll = await prisma.vote.findUnique({
        where: {
          sessionId_pollId: {
            sessionId,
            pollId,
          }
        }
      })
      // If previous vote was on a different option
      if (userPreviousVoteOnPoll && userPreviousVoteOnPoll.pollOptionId !== pollOptionId) {
        // Delete previous vote
        await prisma.vote.delete({
          where: {
            id: userPreviousVoteOnPoll.id
          }
        })
        // Update score on redis
        const votes = await redis.zincrby(pollId, -1, userPreviousVoteOnPoll.pollOptionId)
        // Pub votes to all subscribers watching the poll via websocket
        voting.publish(pollId, {
          pollOptionId: userPreviousVoteOnPoll.pollOptionId,
          votes: Number(votes)
        })
      }
      // But if current vote, is on the same option as before
      else if (userPreviousVoteOnPoll) {
        // You cant vote more than 1x bro...
        return res.status(400).send({ message: "You already voted on this poll!" })
      }
    }
    // If user dont have it yet
    if (!sessionId) {
      // Create one
      sessionId = randomUUID()
      // And register a signed cookie as http only
      res.setCookie('sessionId', sessionId, {
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        signed: true,
        httpOnly: true,
      })
    }
    // Persist vote on db
    await prisma.vote.create({
      data: {
        sessionId,
        pollId,
        pollOptionId
      }
    })
    // Increment by 1 vote on Redis
    const votes = await redis.zincrby(pollId, 1, pollOptionId)
    // Pub votes to all subscribers watching the poll via websocket
    voting.publish(pollId, {
      pollOptionId,
      votes: Number(votes)
    })
    // Return
    return res.status(201).send()
  });
}