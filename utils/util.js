const formatTime = date => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${year}年${month}月${day}日`
}

const formatNumber = n => {
  n = n.toString()
  return n[1] ? n : `0${n}`
}

const formatMoney = number => {
  return number.toFixed(2)
}

module.exports = {
  formatTime,
  formatNumber,
  formatMoney
} 