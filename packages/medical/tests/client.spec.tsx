/** @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { SettingsScope, SettingsScopeSnapshot } from '@deepseek-ai/dsh-client-runtime/client'
import type { TranslateNS } from '@deepseek-ai/dsh-client-ui-slots'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { MedicalLauncher } from '../src/client/MedicalLauncher.tsx'
import { MedicalSettingsRow } from '../src/client/MedicalSettingsRow.tsx'
import { MEDICAL_LOCALE_NAMESPACE, zh } from '../src/client/locales.ts'
import type { MedicalSettings } from '../src/types.ts'

afterEach(cleanup)

const t = ((key: keyof typeof zh, params: Record<string, string | number> = {}): string => {
  let value: string = zh[key]
  for (const [name, replacement] of Object.entries(params)) {
    value = value.replaceAll(`{${name}}`, String(replacement))
  }
  return value
}) as TranslateNS<typeof MEDICAL_LOCALE_NAMESPACE>

function settingsScope(enabled: boolean): SettingsScope<MedicalSettings> {
  const snapshot: SettingsScopeSnapshot<MedicalSettings> = {
    status: 'ready',
    value: {
      enabled,
      provider: 'cc-api',
      model: 'claude-fable-5',
      reasoningEffort: 'high',
      armTimeoutMs: 30_000,
    },
    base: undefined,
    user: undefined,
    revision: 1,
    writable: true,
    mode: 'host',
  }
  return {
    getSnapshot: () => snapshot,
    subscribe: () => () => {},
    set: async () => {},
    unset: async () => {},
  }
}

describe('medical settings and case desk', () => {
  it('renders the exact route and persists the enable switch', async () => {
    const setEnabled = vi.fn(async () => {})
    render(<MedicalSettingsRow settings={settingsScope(false)} setEnabled={setEnabled} t={t} />)
    expect(screen.getByText('cc-api / claude-fable-5 / high')).toBeTruthy()
    fireEvent.click(screen.getByRole('switch'))
    await waitFor(() => { expect(setEnabled).toHaveBeenCalledWith(true) })
  })

  it('opens the de-identification desk and validates required case fields', () => {
    render(<MedicalLauncher wide settings={settingsScope(true)} submitCase={vi.fn()} t={t} />)
    fireEvent.click(screen.getByRole('button', { name: '打开医学病例分析' }))
    expect(screen.getByRole('dialog', { name: '临床推演室' })).toBeTruthy()
    expect(screen.getByText('提交前去标识化')).toBeTruthy()
    expect(screen.getByText('cc-api / claude-fable-5 / high')).toBeTruthy()
    expect(screen.queryByText('快速投递')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '创建病例会话并分析' }))
    expect(screen.getByRole('alert').textContent).toContain('主诉和现病史')
  })

  it('submits the selected template and closes after acceptance', async () => {
    const submitCase = vi.fn(async () => {})
    render(<MedicalLauncher wide settings={settingsScope(true)} submitCase={submitCase} t={t} />)
    fireEvent.click(screen.getByRole('button', { name: '打开医学病例分析' }))
    fireEvent.change(screen.getByLabelText('主诉 *'), { target: { value: '腹痛 6 小时' } })
    fireEvent.change(screen.getByLabelText('现病史 *'), { target: { value: '右下腹持续痛' } })
    fireEvent.click(screen.getByRole('button', { name: /鉴别诊断/ }))
    fireEvent.click(screen.getByRole('button', { name: '创建病例会话并分析' }))
    await waitFor(() => { expect(submitCase).toHaveBeenCalledOnce() })
    expect(submitCase.mock.calls[0]?.[0]).toMatchObject({
      chiefComplaint: '腹痛 6 小时',
      presentIllness: '右下腹持续痛',
      mode: 'differential',
    })
    expect(submitCase.mock.calls[0]?.[1]).toEqual([])
    await waitFor(() => { expect(screen.queryByRole('dialog')).toBeNull() })
  })

  it('preserves an attached image beside structured case fields', async () => {
    const submitCase = vi.fn(async () => {})
    render(<MedicalLauncher wide settings={settingsScope(true)} submitCase={submitCase} t={t} />)
    fireEvent.click(screen.getByRole('button', { name: '打开医学病例分析' }))
    fireEvent.change(screen.getByLabelText('主诉 *'), { target: { value: '心悸 2 小时' } })
    fireEvent.change(screen.getByLabelText('现病史 *'), { target: { value: '突发持续心悸' } })
    const image = new File(['image-bytes'], 'ecg.png', { type: 'image/png' })
    fireEvent.change(screen.getByLabelText('选择图片'), { target: { files: [image] } })
    expect(screen.getByRole('button', { name: '移除图片 ecg.png' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: '创建病例会话并分析' }))
    await waitFor(() => { expect(submitCase).toHaveBeenCalledOnce() })
    expect(submitCase.mock.calls[0]?.[0]).toMatchObject({ chiefComplaint: '心悸 2 小时' })
    expect(submitCase.mock.calls[0]?.[1]).toEqual([image])
  })

  it('keeps the launcher discoverable while disabled but removes submission', () => {
    render(<MedicalLauncher wide settings={settingsScope(false)} submitCase={vi.fn()} t={t} />)
    fireEvent.click(screen.getByRole('button', { name: '打开医学病例分析' }))
    expect(screen.getByText('医学插件当前已关闭')).toBeTruthy()
    expect(screen.queryByRole('button', { name: '创建病例会话并分析' })).toBeNull()
  })
})
