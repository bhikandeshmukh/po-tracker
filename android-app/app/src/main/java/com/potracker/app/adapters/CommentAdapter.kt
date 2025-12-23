package com.potracker.app.adapters

import android.view.LayoutInflater
import android.view.ViewGroup
import androidx.recyclerview.widget.DiffUtil
import androidx.recyclerview.widget.ListAdapter
import androidx.recyclerview.widget.RecyclerView
import com.potracker.app.databinding.ItemCommentBinding
import com.potracker.app.models.Comment
import com.potracker.app.utils.DateUtils

class CommentAdapter : ListAdapter<Comment, CommentAdapter.ViewHolder>(DiffCallback()) {

    override fun onCreateViewHolder(parent: ViewGroup, viewType: Int): ViewHolder {
        val binding = ItemCommentBinding.inflate(LayoutInflater.from(parent.context), parent, false)
        return ViewHolder(binding)
    }

    override fun onBindViewHolder(holder: ViewHolder, position: Int) {
        holder.bind(getItem(position))
    }

    inner class ViewHolder(private val binding: ItemCommentBinding) : RecyclerView.ViewHolder(binding.root) {
        fun bind(comment: Comment) {
            binding.tvUser.text = comment.createdBy.ifEmpty { "User" }
            binding.tvText.text = comment.text
            binding.tvDate.text = DateUtils.formatDateTime(comment.createdAt)
        }
    }

    class DiffCallback : DiffUtil.ItemCallback<Comment>() {
        override fun areItemsTheSame(oldItem: Comment, newItem: Comment) = oldItem.id == newItem.id
        override fun areContentsTheSame(oldItem: Comment, newItem: Comment) = oldItem == newItem
    }
}
