<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-100 p-4"> <!-- 增加 p-4 防止手机贴边 -->
    <div class="bg-white p-8 rounded-xl shadow-md w-full max-w-sm"> <!-- w-96 改为 max-w-sm 适配小屏 -->
      <div class="flex justify-center mb-4">
        <div class="w-16 h-16 bg-orange-500 rounded-xl flex items-center justify-center text-white font-bold text-3xl">驼</div>
      </div>
      <h2 class="text-2xl font-bold mb-6 text-center text-gray-800">驼场管理系统</h2>
      
      <el-form label-position="top">
        <el-form-item label="手机号码">
          <el-input 
            v-model="phone" 
            placeholder="请输入11位手机号" 
            maxlength="11"
            type="tel"
          >
            <template #prefix>+86</template>
          </el-input>
        </el-form-item>
        
        <el-form-item label="登录密码">
          <el-input 
            v-model="password" 
            type="password" 
            placeholder="请输入密码" 
            show-password
            @keyup.enter="handleLogin" 
          />
        </el-form-item>
        
        <el-button type="primary" class="w-full mt-4 !h-10 !text-base" :loading="loading" @click="handleLogin">
          登录 / 注册
        </el-button>
        <p class="text-xs text-gray-400 mt-4 text-center">
          首次登录将自动创建账号<br>
          (使用手机号+密码模式)
        </p>
      </el-form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { supabase } from '../lib/supabase'
import { ElMessage } from 'element-plus'

const phone = ref('')
const password = ref('')
const loading = ref(false)

// 虚拟域名后缀（用户不可见，用于满足Supabase邮箱格式要求）
const DOMAIN_SUFFIX = '@camel.local'

const handleLogin = async () => {
  // 1. 简单的手机号校验
  if (!/^1[3-9]\d{9}$/.test(phone.value)) {
    return ElMessage.warning('请输入正确的11位手机号')
  }
  if (password.value.length < 6) {
    return ElMessage.warning('密码至少需要6位')
  }

  loading.value = true
  const email = phone.value + DOMAIN_SUFFIX // 自动拼接

  try {
    // 尝试登录
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password.value,
    })
    
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        const { error: signUpError } = await supabase.auth.signUp({
          email: email,
          password: password.value,
          // 💡 新增：显式告诉 Supabase 不需要元数据
          options: {
            data: {
              phone_number: phone.value // 存一下纯手机号，方便以后查
            }
          }
        })
        if (signUpError) throw signUpError
        
        // 🔴 修改提示语：去掉“请检查邮箱”的说法
        ElMessage.success('注册成功！正在自动登录...')
        
        // 注册成功后，Supabase v2 有时需要再次发起登录，或者自动登录
        // 我们这里稳妥起见，如果 session 没自动建立，手动再调一次登录
        const { data: loginData } = await supabase.auth.signInWithPassword({
          email: email,
          password: password.value,
        })
        
      } else {
        throw error
      }
    } else {
      ElMessage.success('登录成功')
    }
  } catch (err) {
    console.error(err)
    ElMessage.error('操作失败：' + (err.message === 'User already registered' ? '密码错误' : err.message))
  } finally {
    loading.value = false
  }
}
</script>