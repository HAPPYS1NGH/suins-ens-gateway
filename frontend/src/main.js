import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'
import { normalize } from 'viem/ens'
import './style.css'

// SUI coinType from SLIP-0044
const SUI_COIN_TYPE = 784

const publicClient = createPublicClient({
  chain: mainnet,
  transport: http('https://lb.drpc.live/ethereum/AgdZ5qspL0mEhBDVZYjN4FwjX_Dm-68R8LLleho1c5bd'),
})

const ensInput = document.getElementById('ensName')
const resolveBtn = document.getElementById('resolveBtn')
const btnText = document.querySelector('.btn-text')
const btnLoader = document.querySelector('.btn-loader')
const btnArrow = document.querySelector('.btn-arrow')
const resultDiv = document.getElementById('result')
const suiAddressDiv = document.getElementById('suiAddress')
const errorDiv = document.getElementById('error')
const copyBtn = document.getElementById('copyBtn')
const avatarImg = document.getElementById('avatarImg')
const suiNameEl = document.getElementById('suiName')
const contentLink = document.getElementById('contentLink')

// Build full ENS name from input
function getFullEnsName(input) {
  let name = input.trim().toLowerCase()
  // Remove @ if user types it
  if (name.startsWith('@')) {
    name = name.slice(1)
  }
  // Remove .onsui.eth if user adds it
  if (name.endsWith('.onsui.eth')) {
    name = name.slice(0, -10)
  }
  // Remove .sui if user adds it
  if (name.endsWith('.sui')) {
    name = name.slice(0, -4)
  }
  return `${name}.onsui.eth`
}

async function resolveAddress() {
  const rawInput = ensInput.value.trim()

  if (!rawInput) {
    showError('Enter a name to resolve')
    return
  }

  const ensName = getFullEnsName(rawInput)

  // Show loading state
  setLoading(true)
  resultDiv.classList.remove('show')
  errorDiv.classList.remove('show')
  resetRecords()

  try {
    const normalized = normalize(ensName)

    const suiAddress = await publicClient.getEnsAddress({
      name: normalized,
      coinType: SUI_COIN_TYPE,
    })

    if (suiAddress) {
      suiAddressDiv.textContent = suiAddress
      resultDiv.classList.add('show')

      // Fetch avatar, content hash, and .sui name in parallel
      const [avatarResult, contentHashResult, suiNameResult] = await Promise.allSettled([
        publicClient.getEnsText({ name: normalized, key: 'avatar' }),
        publicClient.getEnsText({ name: normalized, key: 'contentHash' }),
        publicClient.getEnsText({ name: normalized, key: 'org.suins.name' }),
      ])

      // Avatar
      const avatar = avatarResult.status === 'fulfilled' ? avatarResult.value : null
      if (avatar) {
        avatarImg.src = avatar
        avatarImg.alt = `${rawInput} avatar`
        avatarImg.classList.add('show')
      }

      // .sui name
      const suiName = suiNameResult.status === 'fulfilled' ? suiNameResult.value : null
      if (suiName) {
        suiNameEl.textContent = suiName
        suiNameEl.classList.add('show')
      }

      // Content hash → eth.limo link
      const contentHash = contentHashResult.status === 'fulfilled' ? contentHashResult.value : null
      if (contentHash) {
        contentLink.href = `https://${ensName.replace('.onsui.eth', '')}.onsui.eth.limo`
        contentLink.classList.add('show')
      }
    } else {
      showError(`No SUI address found for @${rawInput}`)
    }
  } catch (err) {
    console.error(err)
    if (err.message?.includes('CCIP')) {
      showError('Gateway unreachable. Make sure the gateway is running.')
    } else {
      showError(err.shortMessage || err.message || 'Failed to resolve')
    }
  } finally {
    setLoading(false)
  }
}

function resetRecords() {
  avatarImg.src = ''
  avatarImg.classList.remove('show')
  suiNameEl.textContent = ''
  suiNameEl.classList.remove('show')
  contentLink.href = ''
  contentLink.classList.remove('show')
}

function setLoading(loading) {
  if (loading) {
    btnText.style.display = 'none'
    btnArrow.style.display = 'none'
    btnLoader.style.display = 'flex'
    resolveBtn.disabled = true
  } else {
    btnText.style.display = 'inline'
    btnArrow.style.display = 'inline'
    btnLoader.style.display = 'none'
    resolveBtn.disabled = false
  }
}

function showError(message) {
  errorDiv.textContent = message
  errorDiv.classList.add('show')
  resultDiv.classList.remove('show')
}

// Copy address to clipboard
copyBtn.addEventListener('click', async () => {
  const address = suiAddressDiv.textContent
  if (address) {
    await navigator.clipboard.writeText(address)
    copyBtn.classList.add('copied')
    setTimeout(() => copyBtn.classList.remove('copied'), 1500)
  }
})

resolveBtn.addEventListener('click', resolveAddress)

ensInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    resolveAddress()
  }
})

// Focus input on load
ensInput.focus()
ensInput.select()
