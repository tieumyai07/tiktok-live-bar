using System;
using System.Collections.Generic;
using System.Globalization;
using System.Linq;
using UnityEngine;

namespace TikTokLiveGame
{
    /// <summary>
    /// Thư viện nhân vật sprite trên sàn nhảy.
    /// Danh sách đọc từ Resources/Characters/manifest.txt (do scripts/import-dancer-clips.js tạo),
    /// mỗi dòng: &lt;thư mục&gt; &lt;tần suất&gt; &lt;hệ số cao&gt; &lt;fps&gt;. Không có manifest thì dùng danh sách mặc định.
    /// </summary>
    public static class CharacterLibrary
    {
        private sealed class Entry
        {
            public string Name;
            public float Weight = 1f;
            public float HeightScale = 1f;
            public float Fps = 12f;
        }

        private static readonly string[] DefaultNames =
        {
            "a", "b", "c", "d", "e", "g", "h", "j", "k",
            "mushroom_dance_01", "mushroom_dance_15", "mushroom_magic_02",
            "hanhan_video_dance"
        };

        private static readonly Dictionary<string, Sprite[]> Cache = new();
        private static Dictionary<string, Entry> entries;

        public static (string name, Sprite[] frames) RandomCharacter(string except = null)
        {
            EnsureLoaded();
            List<Entry> choices = entries.Values.Where(entry => entry.Name != except).ToList();
            if (choices.Count == 0) choices = entries.Values.ToList();
            float total = choices.Sum(entry => entry.Weight);
            float roll = UnityEngine.Random.value * total;
            Entry picked = choices[^1];
            foreach (Entry entry in choices)
            {
                roll -= entry.Weight;
                if (roll <= 0f) { picked = entry; break; }
            }
            return (picked.Name, Load(picked.Name));
        }

        /// <summary>Hệ số nhân chiều cao hiển thị của nhân vật (1 = chuẩn).</summary>
        public static float HeightScale(string name)
        {
            EnsureLoaded();
            return name != null && entries.TryGetValue(name, out Entry entry) ? entry.HeightScale : 1f;
        }

        /// <summary>Tốc độ phát khung hình của nhân vật.</summary>
        public static float Fps(string name)
        {
            EnsureLoaded();
            return name != null && entries.TryGetValue(name, out Entry entry) ? entry.Fps : 12f;
        }

        private static void EnsureLoaded()
        {
            if (entries != null) return;
            entries = new Dictionary<string, Entry>();
            TextAsset manifest = Resources.Load<TextAsset>("Characters/manifest");
            if (manifest != null)
            {
                foreach (string rawLine in manifest.text.Split('\n'))
                {
                    string line = rawLine.Trim();
                    if (line.Length == 0 || line.StartsWith("#")) continue;
                    string[] parts = line.Split((char[])null, StringSplitOptions.RemoveEmptyEntries);
                    Entry entry = new() { Name = parts[0] };
                    if (parts.Length > 1 && float.TryParse(parts[1], NumberStyles.Float, CultureInfo.InvariantCulture, out float weight)) entry.Weight = Mathf.Max(0f, weight);
                    if (parts.Length > 2 && float.TryParse(parts[2], NumberStyles.Float, CultureInfo.InvariantCulture, out float height)) entry.HeightScale = Mathf.Clamp(height, 0.3f, 3f);
                    if (parts.Length > 3 && float.TryParse(parts[3], NumberStyles.Float, CultureInfo.InvariantCulture, out float fps)) entry.Fps = Mathf.Clamp(fps, 1f, 60f);
                    if (entry.Weight > 0f && Load(entry.Name).Length > 0) entries[entry.Name] = entry;
                }
            }
            if (entries.Count == 0)
            {
                foreach (string name in DefaultNames)
                    entries[name] = new Entry { Name = name, Fps = name == "hanhan_video_dance" ? 15f : 12f };
            }
            Debug.Log($"CharacterLibrary: {entries.Count} nhân vật ({(manifest != null ? "manifest" : "mặc định")}).");
        }

        private static Sprite[] Load(string name)
        {
            if (Cache.TryGetValue(name, out Sprite[] cached)) return cached;
            Sprite[] frames = Resources.LoadAll<Sprite>($"Characters/{name}")
                .OrderBy(sprite => sprite.name, StringComparer.Ordinal)
                .ToArray();
            Cache[name] = frames;
            return frames;
        }
    }
}
