# fix_json_ids.py - 修复JSON文件中的错误ID
import json
import glob
import os

def fix_post_id(url):
    """从Reddit URL中提取正确的ID"""
    if '/comments/' in url:
        parts = url.split('/comments/')
        if len(parts) > 1:
            id_part = parts[1].split('/')[0]
            return f"reddit_{id_part}"
    return "reddit_unknown"

def fix_json_file(file_path):
    """修复单个JSON文件的ID"""
    print(f"\n处理文件: {file_path}")
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        posts = data.get('posts', [])
        fixed_count = 0
        
        for post in posts:
            old_id = post.get('id', '')
            url = post.get('url', '')
            
            if old_id == 'reddit_' or old_id.startswith('reddit_') and len(old_id) < 10:
                # ID有问题，需要修复
                new_id = fix_post_id(url)
                if new_id != old_id:
                    post['id'] = new_id
                    fixed_count += 1
                    print(f"  修复ID: {old_id} -> {new_id}")
        
        if fixed_count > 0:
            # 保存修复后的文件
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(data, f, ensure_ascii=False, indent=2)
            print(f"  成功修复 {fixed_count} 个ID")
        else:
            print(f"  无需修复")
        
        return fixed_count
    
    except Exception as e:
        print(f"  错误: {e}")
        return 0

def main():
    print("=" * 60)
    print("Reddit JSON文件ID修复工具")
    print("=" * 60)
    
    # 查找所有JSON文件
    json_files = glob.glob("data/reddit_technology_report_*.json")
    json_files.sort()
    
    if not json_files:
        print("未找到任何JSON文件")
        return
    
    print(f"找到 {len(json_files)} 个JSON文件\n")
    
    total_fixed = 0
    for json_file in json_files:
        count = fix_json_file(json_file)
        total_fixed += count
    
    print("\n" + "=" * 60)
    print(f"修复完成！共修复 {total_fixed} 个ID")
    print("=" * 60)

if __name__ == "__main__":
    main()

