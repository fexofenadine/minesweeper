//settings that survive blocked storage
export const load = (key) => {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

export const save = (key, value) => {
  try {
    localStorage.setItem(key, value)
  } catch {
    //settings just are not remembered
  }
}

export const remove = (key) => {
  try {
    localStorage.removeItem(key)
  } catch {
    //nothing was stored
  }
}
