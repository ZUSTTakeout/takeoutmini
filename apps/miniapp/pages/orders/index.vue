<script setup
    lang="ts">    import { ref, onShow } from 'vue'; import { api } from '../../lib/api'; const orders = ref<any[]>([]), loading = ref(false); async function load() { if (!api.token) try { await api.login() } catch { }; loading.value = true; try { orders.value = await api.request('/orders') } catch (e: any) { uni.showToast({ title: e.message, icon: 'none' }) } finally { loading.value = false } } async function cancel(o: any) { try { await api.request(`/orders/${o.id}/status`, 'PATCH', { status: 'CANCELLED' }); load() } catch (e: any) { uni.showToast({ title: e.message, icon: 'none' }) } } onShow(load)</script>
<template>
    <view class="page">
        <view class="title">我的订单</view>
        <view v-if="!orders.length && !loading" class="empty">还没有订单，去逛逛附近店铺吧</view>
        <view v-for="o in orders" :key="o.id" class="card">
            <view class="top"><text>{{ o.shop.name }}</text><text
                    class="status">{{ ({ CREATED: '待接单', ACCEPTED: '制作中', READY: '待取餐', COMPLETED: '已完成', CANCELLED: '已取消' } as
                    any)[o.status]}}</text></view>
            <view class="items">{{o.items.map((x: any) => x.name + ' × ' + x.quantity).join('、')}}</view>
            <view class="foot"><text>{{ api.money(o.total) }}</text><button v-if="o.status === 'CREATED'"
                    @click="cancel(o)">取消订单</button></view>
        </view>
    </view>
</template>
<style
    scoped>
    .page {
        padding: 44rpx 32rpx
    }

    .title {
        font-size: 48rpx;
        font-weight: 800;
        margin-bottom: 30rpx
    }

    .card {
        background: #fff;
        border-radius: 24rpx;
        padding: 28rpx;
        margin-bottom: 20rpx
    }

    .top,
    .foot {
        display: flex;
        justify-content: space-between;
        font-size: 30rpx;
        font-weight: 700
    }

    .status {
        font-size: 24rpx;
        color: #f36d3b
    }

    .items {
        color: #777;
        font-size: 25rpx;
        padding: 25rpx 0
    }

    .foot text {
        color: #ed5c2c
    }

    .foot button {
        font-size: 22rpx;
        margin: 0;
        padding: 8rpx 22rpx;
        color: #888
    }

    .empty {
        text-align: center;
        color: #aaa;
        padding-top: 180rpx
    }
</style>
