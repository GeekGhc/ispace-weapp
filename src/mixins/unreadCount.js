import wepy from 'wepy'

export default class unreadCount extends wepy.mixin {
  data = {
        // 轮询
    interval: null,
        // 未读消息数
    unreadCount: 0
  }
    // 页面显示
  onShow() {
        // 小程序启动时调用获取唯独消息数
    this.updateUnreadCount()
        // 每隔60秒调用一次获取未读数接口
    this.interval = setInterval(() => {
      this.updateUnreadCount()
    }, 30000)
  }
    // 页面隐藏
  onHiden() {
        // 关闭轮询
    clearInterval(this.interval)
  }
    // 设置未读消息数
  updateUnreadCount() {
        // 从全局获取未读消息数
    this.unreadCount = this.$parent.globalData.unreadCount
    this.$apply()

    if (this.unreadCount) {
            // 设置page
      wepy.setTabBarBadge({
        index: 1,
        text: this.unreadCount.toString()
      })
    } else {
            // 移除badge
      wepy.removeTabBarBadge({
        index: 1
      })
    }
  }
}
