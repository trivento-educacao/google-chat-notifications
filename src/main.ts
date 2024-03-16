import * as core from '@actions/core'
import * as JobStatus from './status'
import * as GoogleChat from './chat'

async function run() {
  try {
    const title = core.getInput('title', { required: false }) || 'Build'
    const subtitle = core.getInput('subtitle', { required: false })
    const webhookUrl = core.getInput('webhookUrl', { required: true })
    const status = JobStatus.parse(core.getInput('status', { required: true }))
    const threadKey = core.getInput('threadKey', { required: false })

    core.debug(
      `input params: title=${title}, subtitle=${subtitle}, status=${status}, webhookUrl=${webhookUrl}, threadKey=${threadKey}`,
    )

    await GoogleChat.notify({ title, subtitle, webhookUrl, status, threadKey })
    console.info('Sent message.')
  } catch (error: any) {
    core.debug(error)
    core.setFailed(error.message)
  }
}

run()
