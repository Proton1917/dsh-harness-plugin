import { Tokenizer } from '@huggingface/tokenizers'
import type { ContentBlock, Message } from '@deepseek-ai/dsh-llm'
import type { EpochHeader } from '@deepseek-ai/dsh-session'

const SPECIAL = {
  assistant: '<｜Assistant｜>',
  beginOfSentence: '<｜begin▁of▁sentence｜>',
  endOfSentence: '<｜end▁of▁sentence｜>',
  toolCallBegin: '<｜tool▁call▁begin｜>',
  toolCallEnd: '<｜tool▁call▁end｜>',
  toolCallsBegin: '<｜tool▁calls▁begin｜>',
  toolCallsEnd: '<｜tool▁calls▁end｜>',
  toolOutputBegin: '<｜tool▁output▁begin｜>',
  toolOutputEnd: '<｜tool▁output▁end｜>',
  toolOutputsBegin: '<｜tool▁outputs▁begin｜>',
  toolOutputsEnd: '<｜tool▁outputs▁end｜>',
  toolSeparator: '<｜tool▁sep｜>',
  user: '<｜User｜>',
} as const

/** DeepSeek tokenizer operations needed by the live projection. */
export interface TokenCounter {
  /** Count one raw string without adding model framing tokens. */
  countText(text: string): number
  /** Estimate one complete model-visible message, including provider framing. */
  countMessage(message: Message): number
  /** Estimate framing and tool schemas stored in the request header. */
  countHeader(header: EpochHeader | undefined): number
  /** Count the generated assistant blocks, including the terminal token. */
  countAssistantOutput(blocks: readonly ContentBlock[]): number
}

function textOf(blocks: readonly ContentBlock[], counter: (text: string) => number): number {
  let tokens = 0
  for (const block of blocks) {
    switch (block.type) {
      case 'text':
      case 'reasoning':
        tokens += counter(block.text)
        break
      case 'tool-call':
        tokens += counter(
          `${SPECIAL.toolCallBegin}function${SPECIAL.toolSeparator}${block.name}\n`
          + `\`\`\`json\n${block.arguments}\n\`\`\`${SPECIAL.toolCallEnd}`,
        )
        break
      case 'tool-result':
        tokens += counter(SPECIAL.toolOutputBegin)
          + textOf(block.content, counter)
          + counter(SPECIAL.toolOutputEnd)
        break
      default:
        tokens += counter(JSON.stringify(block))
    }
  }
  return tokens
}

/** Load the official DeepSeek tokenizer used for provisional current-API accounting. */
export function createTokenCounter(data: object, config: object): TokenCounter {
  const tokenizer = new Tokenizer(data, config)
  const countText = (text: string): number => text === ''
    ? 0
    : tokenizer.encode(text, { add_special_tokens: false }).ids.length
  const countSpecial = (value: string): number => countText(value)

  const countAssistantOutput = (blocks: readonly ContentBlock[]): number => {
    if (blocks.length === 0) return 0
    const toolCalls = blocks.filter(block => block.type === 'tool-call')
    if (toolCalls.length === 0) {
      return textOf(blocks, countText) + countSpecial(SPECIAL.endOfSentence)
    }
    return textOf(blocks.filter(block => block.type !== 'tool-call'), countText)
      + countSpecial(SPECIAL.toolCallsBegin)
      + textOf(toolCalls, countText)
      + Math.max(0, toolCalls.length - 1) * countText('\n')
      + countSpecial(SPECIAL.toolCallsEnd)
      + countSpecial(SPECIAL.endOfSentence)
  }

  return {
    countText,
    countAssistantOutput,
    countMessage(message) {
      if (message.role === 'system') return textOf(message.content, countText)
      if (message.source.kind === 'tool') {
        return countSpecial(SPECIAL.toolOutputsBegin)
          + textOf(message.content, countText)
          + countSpecial(SPECIAL.toolOutputsEnd)
      }
      if (message.role === 'assistant') {
        return countSpecial(SPECIAL.assistant) + countAssistantOutput(message.content)
      }
      return countSpecial(SPECIAL.user) + textOf(message.content, countText)
    },
    countHeader(header) {
      if (header === undefined) return 0
      return countSpecial(SPECIAL.beginOfSentence)
        + countText(header.tools === undefined ? '' : JSON.stringify(header.tools))
    },
  }
}
