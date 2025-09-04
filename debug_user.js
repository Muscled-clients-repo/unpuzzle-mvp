console.log('[DEBUG] User ID:', JSON.stringify({
  user: store.getState().user?.id,
  profile: store.getState().profile,
  loading: store.getState().loading
}, null, 2))
