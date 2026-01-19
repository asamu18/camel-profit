<template>
  <div class="p-4 bg-gray-50 min-h-screen">
    <!-- 顶部标题 -->
    <div class="flex justify-between items-center mb-4 sticky top-0 bg-gray-50 z-10 py-2">
      <h2 class="text-xl font-bold text-gray-800">驼户广场</h2>
      <el-button type="primary" size="small" round @click="showPostModal = true">
        <el-icon class="mr-1"><Edit /></el-icon> 发布
      </el-button>
    </div>

    <!-- 分类标签 -->
    <div class="flex gap-2 mb-4 overflow-x-auto pb-2">
      <el-tag 
        v-for="type in types" :key="type"
        :effect="activeType === type ? 'dark' : 'plain'"
        class="cursor-pointer"
        @click="filterType(type)"
      >
        {{ type }}
      </el-tag>
    </div>

    <!-- 帖子列表 -->
    <div v-loading="loading" class="space-y-3">
      <div v-for="post in posts" :key="post.id" class="bg-white p-4 rounded-lg shadow-sm border border-gray-100">
        <div class="flex justify-between items-start mb-2">
          <el-tag size="small" :type="getTagType(post.type)">{{ post.type }}</el-tag>
          <span class="text-xs text-gray-400">{{ formatDate(post.created_at) }}</span>
        </div>
        <h3 class="font-bold text-lg text-gray-800 mb-2">{{ post.title }}</h3>
        <p class="text-gray-600 text-sm mb-3 whitespace-pre-wrap">{{ post.content }}</p>
        
        <div class="border-t pt-2 flex justify-between items-center mt-2">
          <span class="text-sm text-gray-500">联系人：驼友</span>
          <a :href="'tel:' + post.contact_info" class="text-blue-600 text-sm font-bold flex items-center">
            <el-icon class="mr-1"><Phone /></el-icon> 拨打 {{ post.contact_info }}
          </a>
        </div>
      </div>
      <el-empty v-if="!loading && posts.length === 0" description="暂无信息，快来发布第一条吧" />
    </div>

    <!-- 发布弹窗 -->
    <el-dialog v-model="showPostModal" title="发布信息" width="90%" style="max-width:500px">
      <el-form label-position="top">
        <el-form-item label="类型">
          <el-radio-group v-model="form.type">
            <el-radio-button label="招聘" />
            <el-radio-button label="出租" />
            <el-radio-button label="求助" />
            <el-radio-button label="广告" />
          </el-radio-group>
        </el-form-item>
        <el-form-item label="标题">
          <el-input v-model="form.title" placeholder="如：急招养殖工两名" />
        </el-form-item>
        <el-form-item label="详情">
          <el-input v-model="form.content" type="textarea" rows="3" placeholder="请描述具体要求..." />
        </el-form-item>
        <el-form-item label="联系电话">
          <el-input v-model="form.contact_info" placeholder="方便他人联系你" type="tel" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showPostModal = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitPost">发布</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { supabase } from '../lib/supabase'
import { Edit, Phone } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const types = ['全部', '招聘', '出租', '求助', '广告']
const activeType = ref('全部')
const posts = ref([])
const loading = ref(false)
const showPostModal = ref(false)
const submitting = ref(false)

const form = reactive({ type: '招聘', title: '', content: '', contact_info: '' })

// 1. 获取帖子
const fetchPosts = async () => {
  loading.value = true
  let query = supabase.from('posts').select('*').order('created_at', { ascending: false })
  
  if (activeType.value !== '全部') {
    query = query.eq('type', activeType.value)
  }
  
  const { data, error } = await query
  if (!error) posts.value = data
  loading.value = false
}

// 2. 筛选
const filterType = (type) => {
  activeType.value = type
  fetchPosts()
}

// 3. 发布
const submitPost = async () => {
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  // 如果服务器返回 403 或者没有用户对象，说明 Token 坏了
  if (userError || !user) {
    console.error('身份验证失败:', userError)
    ElMessage.error('您的登录状态已失效，请点击底部"退出"后重新登录')
    submitting.value = false
    return // 直接结束，不往下执行，防止报错
  }
  
  const { error } = await supabase.from('posts').insert([{
    user_id: user.id,
    ...form
  }])

  if (error) {
    ElMessage.error('发布失败')
  } else {
    ElMessage.success('发布成功')
    showPostModal.value = false
    // 清空表单
    form.title = ''
    form.content = ''
    fetchPosts()
  }
  submitting.value = false
}

// 工具函数
const getTagType = (t) => {
  const map = { '招聘': 'success', '出租': 'warning', '求助': 'danger', '广告': 'info' }
  return map[t] || ''
}
const formatDate = (str) => new Date(str).toLocaleDateString()

onMounted(fetchPosts)
</script>