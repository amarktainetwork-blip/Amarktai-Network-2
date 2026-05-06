import { execFile } from 'child_process'
import { access } from 'fs/promises'
import path from 'path'
import { promisify } from 'util'
import { getProviderKey } from '@/lib/provider-config'

const execFileAsync = promisify(execFile)

export interface ResearchToolStatus {
  firecrawl: { configured: boolean; tested: boolean; status: string }
  crawl4ai: { available: boolean; status: string }
  playwright: { available: boolean; status: string }
  order: string[]
}

export async function getResearchToolStatus(): Promise<ResearchToolStatus> {
  const [firecrawlKey, crawl4ai, playwright] = await Promise.all([
    getProviderKey('firecrawl').catch(() => null),
    commandAvailable('crawl4ai'),
    packageAvailable('playwright'),
  ])

  return {
    firecrawl: {
      configured: Boolean(firecrawlKey || process.env.FIRECRAWL_API_KEY),
      tested: Boolean(firecrawlKey || process.env.FIRECRAWL_API_KEY),
      status: firecrawlKey || process.env.FIRECRAWL_API_KEY ? 'Configured' : 'Needs key/test',
    },
    crawl4ai: {
      available: crawl4ai,
      status: crawl4ai ? 'Available locally' : 'Unavailable locally',
    },
    playwright: {
      available: playwright,
      status: playwright ? 'Available locally' : 'Unavailable locally',
    },
    order: ['Firecrawl', 'Crawl4AI', 'Playwright'],
  }
}

async function commandAvailable(command: string) {
  try {
    await execFileAsync(command, ['--help'], { timeout: 5_000, windowsHide: true })
    return true
  } catch {
    return false
  }
}

async function packageAvailable(packageName: string) {
  try {
    await access(path.join(process.cwd(), 'node_modules', packageName, 'package.json'))
    return true
  } catch {
    return false
  }
}
