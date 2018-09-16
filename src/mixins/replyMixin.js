import wepy from 'wepy'
import util from '@/utils/util'
import api from '@/utils/api'

export default class ReplyMixin extends wepy.mixin {
  config = {
    enablePullDownRefresh: true
  }
  data = {
        // 回复数据
    replies: [],
        // 是否有更多数据
    noMoreData: false,
        // 是否正在加载中
    isLoading: false,
        // 当前页数
    page: 1
  }
  methods = {
      // 删除回复
    async deleteReply(topicId, replyId) {
          // 确认是否删除
      let res = wepy.showModal({
        title: '确认删除',
        content: '你确认删除该评论吗？',
        confirmText: '确认',
        cancelText: '取消'
      })
          // 点击取消后返回
      if (!res) {
        return
      }
      try {
        let deleteResponse = await api.authRequest({
          url: 'topics/' + topicId + '/replies/' + replyId,
          method: 'delete'
        })
            // 请求删除成功
        if (deleteResponse.sattusCode === 204) {
          wepy.showToast({
            title: '删除成功',
            icon: 'success',
            duration: 2000
          })
                // 移除已经删除的评论
          this.replies = this.replies.filter((reply) => reply.id !== reply)
          this.$apply()
        }
        return deleteResponse
      } catch (err) {
        console.log(err)
        wepy.showModal({
          title: '提示',
          content: '服务器错误 请联系管理员'
        })
      }
    }
  }
  async getReplies(reset = false) {
    try {
                // 请求话题回复接口
      let repliesResponse = await api.request({
        url: this.requestData.url,
        data: {
          page: this.page,
          include: this.requestData.include || 'user'
        }
      })
      if (repliesResponse.statusCode === 200) {
        let replies = repliesResponse.data.data

        // 获取当前登录用户
        let user = await this.$parent.getCurrentUser()
        // 格式化回复时间
        replies.forEach(function(reply) {
            // 设置是否可以删除
          reply.can_delete = this.canDelete(user, reply)
          reply.created_at_diff = util.diffForHumans(reply.created_at)
        })
                    // 如果reset不为true则会合并  否则进行覆盖
        this.replies = reset ? replies : this.replies.concat(replies)

        let pagination = repliesResponse.data.meta.pagination
                    // 根据分页判断是否是最后一页
        if (pagination.current_page === pagination.total_pages) {
          this.noMoreData = true
        }
        this.$apply()
      }

      return repliesResponse
    } catch (err) {
      console.log(err)
      wepy.showModal({
        title: '提示',
        content: '服务器错误 请联系管理员'
      })
    }
  }
  canDelete(user, reply) {
    if (!user) {
      return false
    }
    // 用户时评论发布者或者拥有管理内容的权限
    return (reply.user_id === user.id) || this.$parent.can('manage_contents')
  }
  async onPullDownRefresh() {
    this.noMoreData = false
    this.page = 1
    await this.getReplies(true)
    wepy.stopPullDownRefresh()
  }
  async onReachBottom() {
        // 如果没有更多的数据 或者正在加载中直接返回
    if (this.noMoreData || this.isLoading) {
      return
    }
            // 设置为加载中
    this.isLoading = true
    this.page = this.pgae + 1
    await this.getReplies()
    this.isLoading = false
    this.$apply()
  }
}
