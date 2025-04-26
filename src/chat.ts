import * as github from '@actions/github'
import * as axios from 'axios'
import { Status } from './status'

const statusColorPalette: { [key in Status]: string } = {
  success: '#2cbe4e',
  cancelled: '#ffc107',
  failure: '#ff0000',
}

const statusText: { [key in Status]: string } = {
  success: 'SUCESSO',
  cancelled: 'CANCELADO',
  failure: 'FALHOU',
}

const statusIcon: { [key in Status]: string } = {
  success: 'https://raw.githubusercontent.com/nakamuraos/google-chat-notifications/master/icons/success.png',
  cancelled: 'https://raw.githubusercontent.com/nakamuraos/google-chat-notifications/master/icons/cancelled.png',
  failure: 'https://raw.githubusercontent.com/nakamuraos/google-chat-notifications/master/icons/failure.png',
}

const textButton = (text: string, url: string) => ({
  text,
  onClick: { openLink: { url } },
})

const htmlEntities = (str: string) => {
  return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export async function notify({
  title,
  subtitle,
  webhookUrl,
  status,
  threadKey,
}: {
  title: string
  subtitle?: string
  webhookUrl: string
  status: Status
  threadKey?: string
}) {
  const { owner, repo } = github.context.repo
  const { eventName, sha, ref, actor } = github.context
  const { number } = github.context.issue
  const repoUrl = `https://github.com/${owner}/${repo}`
  const actorURL = `https://github.com/${actor}`
  const eventPath = eventName === 'pull_request' ? `/pull/${number}` : `/commit/${sha}`
  const eventUrl = `${repoUrl}${eventPath}`
  const checksUrl = `${repoUrl}${eventPath}/checks`
  const skRegex = /spaces\/(.*)\//g.exec(webhookUrl)
  const spacesKey = skRegex ? skRegex[1] : undefined

  const body: any = {
    cardsV2: [
      {
        cardId: 'google-chat-notifications',
        card: {
          header: {
            title,
            subtitle: htmlEntities(subtitle?.replace(/(\r\n|\n|\r)/gm, ' ') ?? ''),
            imageUrl: statusIcon[status],
            imageType: 'CIRCLE',
          },
          sections: [
            {
              widgets: [
                {
                  textParagraph: {
                    text: `<b><font color="${statusColorPalette[status]}">${statusText[status]}</font></b>`,
                  },
                },
                {
                  textParagraph: {
                    text: htmlEntities(subtitle?.replace(/(\r\n|\n|\r)/gm, ' ') ?? ''),
                  },
                },
              ],
            },
            {
              widgets: [
                {
                  decoratedText: {
                    topLabel: 'repositório',
                    text: `${owner}/${repo}`,
                    button: textButton('ABRIR REPOSITÓRIO', repoUrl),
                  },
                },
                {
                  decoratedText: {
                    topLabel: 'autor',
                    text: actor,
                    button: textButton('PERFIL', actorURL),
                  },
                },
                {
                  decoratedText: {
                    topLabel: 'ref',
                    text: ref,
                  },
                },
              ],
            },
            {
              widgets: [
                {
                  buttonList: {
                    buttons: [textButton('ABRIR CHECKS', checksUrl)],
                  },
                },
              ],
            },
          ],
        },
      },
    ],
  }

  if (threadKey && spacesKey) {
    body.thread = {
      name: `spaces/${spacesKey}/threads/${threadKey}`,
    }
  }

  const response = await axios.default.post(
    webhookUrl + (body.thread ? '&messageReplyOption=REPLY_MESSAGE_FALLBACK_TO_NEW_THREAD' : ''),
    body,
  )
  if (response.status !== 200) {
    throw new Error(`Notificação do Google Chat falhou. status=${response.status}`)
  }
}
