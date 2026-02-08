import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'
import { normalize } from 'viem/ens'
import './style.css'

// SUI coinType from SLIP-0044
const SUI_COIN_TYPE = 784

const publicClient = createPublicClient({
  chain: mainnet,
  transport: http(),
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

  try {
    const suiAddress = await publicClient.getEnsAddress({
      name: normalize(ensName),
      coinType: SUI_COIN_TYPE,
    })

    if (suiAddress) {
      suiAddressDiv.textContent = suiAddress
      resultDiv.classList.add('show')
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
