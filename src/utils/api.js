import wepy from 'wepy'

// 服务器接口地址
const host = 'http://larabbs.test/api'

// 普通请求
const request = async (options, showLoading = true) => {
    // 简化开发 如果是字符串则简化成对象
  if (typeof options === 'string') {
    options = {
      url: options
    }
  }
    // 显示加载中
  if (showLoading) {
    wepy.showLoading({title: '加载中'})
  }
    // 拼接请求地址
  options.url = host + '/' + options.url
    // 调用小程序的request方法
  let response = await wepy.request(options)

  if (showLoading) {
        // 隐藏加载中
    wepy.hideLoading()
  }

    // 服务器异常时给出提示
  if (response.statusCode === 500) {
    wepy.showModule({
      title: '提示',
      content: '服务器错误，请联系管理员'
    })
  }

  return response
}

// 登录
const login = async (params = {}) => {
    // code只能使用一次 所以每次单独调用
  let loginData = await wepy.login()

    // 参数中增加code
  params.code = loginData.code

    // 请求接口 weapp/authorozation
  let authResponse = await request({
    url: 'weapp/authorizations',
    data: params,
    method: 'post'
  })

    // 登录成功 记录token信息
  if (authResponse.statusCode === 201) {
    wepy.setStorageSync('access_token', authResponse.data.access_token)
    wepy.setStorageSync('access_token_expired_at', new Date().getTime() + authResponse.data.expires_in * 1000)
  }

  return authResponse
}

// 刷新 token
const refreshToken = async (accessToken) => {
    // 请求刷新接口
  let refreshResponse = await wepy.request({
    url: host + '/' + 'authorizations/current',
    method: 'put',
    header: {
      'Authorization': 'Bearer ' + accessToken
    }
  })

    // 刷新成功状态码为200
  if (refreshResponse.statusCode === 200) {
        // 将token和过期时间保存在 storage 中
    wepy.setStorageSync('access_token', refreshResponse.data.access_token)
    wepy.setStorageSync('access_token_expired_at', new Date().getTime() + refreshResponse.data.expires_in * 1000)
  }

  return refreshResponse
}

// 获取token
const getToken = async (options) => {
  // 从缓存中取出token
  let accessToken = wepy.getStorageSync('access_token')
  let expiredAt = wepy.getStorageSync('access_token_expired_at')

  // 如果token过期了 则调用刷新方法
  if (accessToken && new Date().getTime() > expiredAt) {
    let refreshResponse = await refreshToken(accessToken)
    if (refreshResponse.statusCode === 200) {
      accessToken = refreshResponse.data.access_token
    } else {
      // 如果刷新失败了 则重新调用登录方法
      let authResponse = await login()
      if (authResponse.statusCode === 201) {
        accessToken = authResponse.data.access_token
      }
    }
  }

  return accessToken
}

// 带身份认证的请求
const authRequest = async (options, showLoading = true) => {
  if (typeof options === 'string') {
    options = {
      url: options
    }
  }

  let accessToken = await getToken()

    // 将token设置在header
  let header = options.header || {}
  header.Authorization = 'Bearer ' + accessToken
  options.header = header
  return request(options, showLoading)
}

// 退出登录
const logout = async (params = {}) => {
  let accessToken = wepy.getStorageSync('access_token')
    // 调用删除token的接口 让Token失效
  let logoutResponse = await wepy.request({
    url: host + '/' + 'authorizations/current',
    method: 'delete',
    header: {
      'Authorization': 'Bearer ' + accessToken
    }
  })

  if (logoutResponse.statusCode === 204) {
    wepy.clearStorage()
  }
  return logoutResponse
}

export default{
  request,
  login,
  logout,
  authRequest,
  refreshToken
}
