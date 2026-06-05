import { execFile } from 'child_process'
import { access } from 'fs/promises'
import path from 'path'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

export interface ResearchToolStatus {
  playwright: { available: boolean; status: string }
  scrapy: { available: boolean; status: string }
  trafilatura: { available: boolean; status: string }
  localCrawler: { available: boolean; status: string }
  qdrant: { configured: boolean; status: string }
  order: string[]
}

export async function getResearchToolStatus(): Promise<ResearchToolStatus> {
  const [playwright, scrapy, trafilatura, crawlerScript] = await Promise.all([
    packageAvailable('playwright'),
    pythonModuleAvailable('scrapy'),
    pythonModuleAvailable('trafilatura'),
    fileAvailable(path.join(process.cwd(), 'services', 'crawler', 'crawl.py')),
  ])
  const localCrawler = crawlerScript && (trafilatura || playwright)
  return {
    playwright: { available: playwright, status: playwright ? 'Available locally' : 'Install package and browsers' },
    scrapy: { available: scrapy, status: scrapy ? 'Available in Python environment' : 'Install in crawler venv' },
    trafilatura: { available: trafilatura, status: trafilatura ? 'Available in Python environment' : 'Install in crawler venv' },
    localCrawler: { available: localCrawler, status: localCrawler ? 'Ready for local crawling' : 'Crawler dependencies need setup' },
    qdrant: { configured: Boolean(process.env.QDRANT_URL), status: process.env.QDRANT_URL ? 'Configured' : 'Set QDRANT_URL' },
    order: ['Playwright', 'Trafilatura', 'Scrapy', 'Qdrant'],
  }
}

async function pythonModuleAvailable(moduleName: string) {
  for (const command of ['python', 'python3']) {
    try {
      await execFileAsync(command, ['-c', `import ${moduleName}`], { timeout: 5_000, windowsHide: true })
      return true
    } catch {
      // Try the next Python command.
    }
  }
  return false
}

async function packageAvailable(packageName: string) {
  try {
    await access(path.join(process.cwd(), 'node_modules', packageName, 'package.json'))
    return true
  } catch {
    return false
  }
}

async function fileAvailable(filePath: string) {
  try {
    await access(filePath)
    return true
  } catch {
    return false
  }
}
