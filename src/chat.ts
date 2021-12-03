import * as github from '@actions/github'
import * as axios from 'axios'
import { Status } from './status'

const statusColorPalette: { [key in Status]: string } = {
  success: '#2cbe4e',
  cancelled: '#ffc107',
  failure: '#ff0000',
}

const statusText: { [key in Status]: string } = {
  success: 'SUCCEEDED',
  cancelled: 'CANCELLED',
  failure: 'FAILED',
}

const statusIcon: { [key in Status]: string } = {
  success: 'https://raw.githubusercontent.com/nakamuraos/google-chat-notifications/releases/v2.1.0/icons/success.png',
  cancelled:
    'https://raw.githubusercontent.com/nakamuraos/google-chat-notifications/releases/v2.1.0/icons/cancelled.png',
  failure: 'https://raw.githubusercontent.com/nakamuraos/google-chat-notifications/releases/v2.1.0/icons/failure.png',
}

const textButton = (text: string, url: string) => ({
  textButton: {
    text,
    onClick: { openLink: { url } },
  },
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
  const { eventName, sha, ref } = github.context
  const { number } = github.context.issue
  const repoUrl = `https://github.com/${owner}/${repo}`
  const eventPath = eventName === 'pull_request' ? `/pull/${number}` : `/commit/${sha}`
  const eventUrl = `${repoUrl}${eventPath}`
  const checksUrl = `${repoUrl}${eventPath}/checks`
  const skRegex = /spaces\/(.*)\//g.exec(webhookUrl)
  const spacesKey = skRegex ? skRegex[1] : undefined

  const body: any = {
    cards: [
      {
        header: {
          title,
          subtitle: htmlEntities(subtitle?.replace(/(\r\n|\n|\r)/gm, ' ') ?? ''),
          imageUrl: statusIcon[status],
          imageStyle: 'IMAGE',
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
                keyValue: {
                  content: htmlEntities(subtitle?.replace(/(\r\n|\n|\r)/gm, ' ') ?? ''),
                  contentMultiline: true,
                },
              },
            ],
          },
          {
            widgets: [
              {
                keyValue: {
                  topLabel: 'repository',
                  content: `${owner}/${repo}`,
                  contentMultiline: true,
                  button: textButton('OPEN REPOSITORY', repoUrl),
                },
              },
              {
                keyValue: {
                  topLabel: 'event name',
                  content: eventName,
                  button: textButton('OPEN EVENT', eventUrl),
                },
              },
              {
                keyValue: { topLabel: 'ref', content: ref },
              },
            ],
          },
          {
            widgets: [
              {
                buttons: [textButton('OPEN CHECKS', checksUrl)],
              },
            ],
          },
        ],
      },
    ],
  }

  if (threadKey && spacesKey) {
    body.thread = {
      name: `spaces/${spacesKey}/threads/${threadKey}`,
    }
  }

  const response = await axios.default.post(webhookUrl, body)
  if (response.status !== 200) {
    throw new Error(`Google Chat notification failed. response status=${response.status}`)
  }
}
