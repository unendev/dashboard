extends Control

@onready var play_pause: Button = $RootPanel/Layout/MainArea/Header/PlayPause
@onready var timer_label: Label = $RootPanel/Layout/MainArea/Header/TimeBox/TimerLabel
@onready var task_name: Label = $RootPanel/Layout/MainArea/Header/TimeBox/ActiveSubtitle
@onready var drag_handle: Label = $RootPanel/Layout/MainArea/Header/DragHandle
@onready var task_grid: GridContainer = $RootPanel/Layout/MainArea/TaskGrid
@onready var main_area: VBoxContainer = $RootPanel/Layout/MainArea
@onready var add_task_dialog: AcceptDialog = $RootPanel/AddTaskDialog
@onready var add_task_input: LineEdit = $RootPanel/AddTaskDialog/AddTaskInput
@onready var root_panel: Panel = $RootPanel
@onready var header: HBoxContainer = $RootPanel/Layout/MainArea/Header
@onready var sidebar_panel: Panel = $RootPanel/Layout/SidebarPanel
@onready var sidebar: VBoxContainer = $RootPanel/Layout/SidebarPanel/Sidebar
@onready var side_btn_memo: Button = $RootPanel/Layout/SidebarPanel/Sidebar/SideBtnMemo
@onready var side_btn_todo: Button = $RootPanel/Layout/SidebarPanel/Sidebar/SideBtnTodo
@onready var side_btn_ai: Button = $RootPanel/Layout/SidebarPanel/Sidebar/SideBtnAI

const SAVE_PATH := "user://tasks.json"

var is_running := false
var elapsed_sec := 0
var _timer := Timer.new()

var tasks: Array = []
var active_task_id: String = ""

func _ready() -> void:
	add_child(_timer)
	_timer.one_shot = false
	_timer.wait_time = 1.0
	_timer.timeout.connect(_on_tick)

	root_panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	header.mouse_filter = Control.MOUSE_FILTER_PASS
	task_name.mouse_filter = Control.MOUSE_FILTER_IGNORE
	task_grid.mouse_filter = Control.MOUSE_FILTER_PASS
	play_pause.mouse_filter = Control.MOUSE_FILTER_STOP
	drag_handle.mouse_filter = Control.MOUSE_FILTER_IGNORE
	sidebar_panel.mouse_filter = Control.MOUSE_FILTER_PASS
	sidebar.mouse_filter = Control.MOUSE_FILTER_PASS
	side_btn_memo.mouse_filter = Control.MOUSE_FILTER_STOP
	side_btn_todo.mouse_filter = Control.MOUSE_FILTER_STOP
	side_btn_ai.mouse_filter = Control.MOUSE_FILTER_STOP

	_apply_theme()

	play_pause.pressed.connect(_on_play_pause)
	add_task_dialog.confirmed.connect(_on_add_task_confirmed)
	main_area.gui_input.connect(_on_main_area_input)

	_load_tasks()
	_update_display()
	_render_task_list()
	_ensure_active_task()

func _on_play_pause() -> void:
	if active_task_id == "":
		_ensure_active_task()
		if active_task_id == "":
			return
	is_running = !is_running
	if is_running:
		_timer.start()
		play_pause.text = "⏸"
		_set_task_running(active_task_id, true)
	else:
		_timer.stop()
		play_pause.text = "▶"
		_set_task_running(active_task_id, false)
	_apply_play_style()
	_save_tasks()

func _on_tick() -> void:
	elapsed_sec += 1
	_update_display()
	if active_task_id != "":
		_update_task_elapsed(active_task_id, elapsed_sec)

func _update_display() -> void:
	var h = elapsed_sec / 3600
	var m = (elapsed_sec % 3600) / 60
	var s = elapsed_sec % 60
	timer_label.text = "%02d:%02d:%02d" % [h, m, s]

func _render_task_list() -> void:
	for child in task_grid.get_children():
		child.queue_free()

	if tasks.size() == 0:
		var empty_label := Label.new()
		empty_label.text = "暂无任务"
		task_grid.add_child(empty_label)
		return

	for task in tasks:
		var card := _build_task_card(task)
		task_grid.add_child(card)

func _build_task_card(task: Dictionary) -> Control:
	var card := Panel.new()
	card.custom_minimum_size = Vector2(0, 32)
	card.mouse_filter = Control.MOUSE_FILTER_STOP
	card.set_meta("task_id", str(task.get("id", "")))
	card.gui_input.connect(func(event: InputEvent):
		if event is InputEventMouseButton and event.pressed:
			_activate_task(str(task.get("id", "")))
	)
	card.mouse_entered.connect(func():
		_style_task_card(card, _has_tag(task), _is_active(task), true)
	)
	card.mouse_exited.connect(func():
		_style_task_card(card, _has_tag(task), _is_active(task), false)
	)

	var row := HBoxContainer.new()
	row.anchor_right = 1.0
	row.anchor_bottom = 1.0
	row.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.size_flags_vertical = Control.SIZE_EXPAND_FILL
	row.set("theme_override_constants/separation", 6)

	var icon := Label.new()
	icon.text = "▶"
	icon.add_theme_color_override("font_color", Color("f28f3b") if _has_tag(task) else Color("6b7280"))
	icon.custom_minimum_size = Vector2(12, 0)
	icon.add_theme_font_size_override("font_size", 10)
	icon.vertical_alignment = VERTICAL_ALIGNMENT_CENTER

	var name := Label.new()
	name.text = str(task.get("name", ""))
	name.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	name.add_theme_color_override("font_color", Color("f3a56b") if _has_tag(task) else Color("d4d4d4"))
	name.add_theme_font_size_override("font_size", 11)
	name.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
	name.clip_text = true
	name.text_overrun_behavior = TextServer.OVERRUN_TRIM_ELLIPSIS

	row.add_child(icon)
	row.add_child(name)

	if _has_tag(task):
		var tag := Label.new()
		tag.text = "#" + str(task.get("instanceTag", ""))
		tag.add_theme_color_override("font_color", Color("f0a366"))
		tag.add_theme_font_size_override("font_size", 10)
		row.add_child(tag)

	card.add_child(row)
	_style_task_card(card, _has_tag(task), _is_active(task), false)
	return card

func _has_tag(task: Dictionary) -> bool:
	var tag = task.get("instanceTag", "")
	return typeof(tag) == TYPE_STRING and tag.strip_edges() != ""

func _is_active(task: Dictionary) -> bool:
	return str(task.get("id", "")) == active_task_id

func _on_main_area_input(event: InputEvent) -> void:
	if event is InputEventMouseButton and event.pressed and event.double_click:
		add_task_input.text = ""
		add_task_dialog.popup_centered()

func _on_add_task_confirmed() -> void:
	var name := add_task_input.text.strip_edges()
	if name == "":
		return
	_create_task(name)
	_render_task_list()
	_activate_task(active_task_id)

func _activate_task(task_id: String) -> void:
	if active_task_id != "" and active_task_id != task_id:
		_set_task_running(active_task_id, false)

	active_task_id = task_id
	var task = _find_task(task_id)
	if task == null:
		return
	elapsed_sec = int(task.get("elapsed", 0))
	is_running = bool(task.get("is_running", false))
	play_pause.text = "⏸" if is_running else "⏵"
	if not is_running:
		play_pause.text = "▶"
	_apply_play_style()
	if is_running:
		_timer.start()
	else:
		_timer.stop()
	task_name.text = str(task.get("name", ""))
	_update_display()
	_save_tasks()
	_render_task_list()

func _set_task_running(task_id: String, running: bool) -> void:
	var task = _find_task(task_id)
	if task == null:
		return
	task["is_running"] = running

func _update_task_elapsed(task_id: String, value: int) -> void:
	var task = _find_task(task_id)
	if task == null:
		return
	task["elapsed"] = value
	_save_tasks()

func _find_task(task_id: String):
	for t in tasks:
		if str(t.get("id", "")) == task_id:
			return t
	return null

func _load_tasks() -> void:
	if not FileAccess.file_exists(SAVE_PATH):
		_create_task("心理小程...", "心理")
		_create_task("网文", "网文")
		_create_task("日常")
		_create_task("情报")
		return
	var file := FileAccess.open(SAVE_PATH, FileAccess.READ)
	if file == null:
		return
	var content := file.get_as_text()
	file.close()
	var parsed = JSON.parse_string(content)
	if typeof(parsed) == TYPE_ARRAY:
		tasks = parsed
		for t in tasks:
			if bool(t.get("is_running", false)):
				active_task_id = str(t.get("id", ""))
				elapsed_sec = int(t.get("elapsed", 0))
				is_running = true
				_timer.start()
				play_pause.text = "⏸"
				break
	if active_task_id == "" and tasks.size() > 0:
		active_task_id = str(tasks[0].get("id", ""))
		task_name.text = str(tasks[0].get("name", ""))

func _ensure_active_task() -> void:
	if tasks.size() == 0:
		_create_task("示例任务")
		return
	if active_task_id == "":
		_activate_task(str(tasks[0].get("id", "")))

func _save_tasks() -> void:
	var file := FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if file == null:
		return
	file.store_string(JSON.stringify(tasks))
	file.close()

func _create_task(name: String, instance_tag: String = "") -> void:
	var task = {
		"id": str(Time.get_unix_time_from_system()) + "-" + str(randi()),
		"name": name,
		"elapsed": 0,
		"is_running": false,
		"instanceTag": instance_tag
	}
	tasks.append(task)
	active_task_id = str(task.get("id", ""))
	task_name.text = str(task.get("name", ""))
	elapsed_sec = 0
	is_running = false
	play_pause.text = "▶"
	_apply_play_style()
	_save_tasks()

func _apply_theme() -> void:
	var panel_style := StyleBoxFlat.new()
	panel_style.bg_color = Color("1a1a1a")
	panel_style.corner_radius_top_left = 12
	panel_style.corner_radius_top_right = 12
	panel_style.corner_radius_bottom_left = 12
	panel_style.corner_radius_bottom_right = 12
	panel_style.border_color = Color("27272a")
	panel_style.border_width_left = 1
	panel_style.border_width_right = 1
	panel_style.border_width_top = 1
	panel_style.border_width_bottom = 1
	panel_style.shadow_color = Color(0, 0, 0, 0.35)
	panel_style.shadow_size = 10
	panel_style.shadow_offset = Vector2(0, 6)
	root_panel.add_theme_stylebox_override("panel", panel_style)

	var side_style := StyleBoxFlat.new()
	side_style.bg_color = Color("141414")
	side_style.border_width_right = 1
	side_style.border_color = Color("27272a")
	side_style.corner_radius_top_left = 10
	side_style.corner_radius_bottom_left = 10
	sidebar_panel.add_theme_stylebox_override("panel", side_style)

	timer_label.add_theme_color_override("font_color", Color("2bd47c"))
	timer_label.add_theme_font_size_override("font_size", 20)
	task_name.add_theme_color_override("font_color", Color("6ee7b7"))
	task_name.add_theme_font_size_override("font_size", 11)
	drag_handle.add_theme_color_override("font_color", Color("6b7280"))
	drag_handle.add_theme_font_size_override("font_size", 10)
	timer_label.add_theme_constant_override("outline_size", 0)
	task_name.add_theme_constant_override("outline_size", 0)
	timer_label.add_theme_constant_override("line_spacing", -2)
	task_name.add_theme_constant_override("line_spacing", -2)
	timer_label.add_theme_constant_override("shadow_size", 0)
	task_name.add_theme_constant_override("shadow_size", 0)

	_style_header_button(play_pause)
	_style_sidebar_button(side_btn_memo)
	_style_sidebar_button(side_btn_todo)
	_style_sidebar_button(side_btn_ai)

	task_grid.add_theme_constant_override("h_separation", 8)
	task_grid.add_theme_constant_override("v_separation", 8)

func _apply_play_style() -> void:
	var bg = Color("10b981")
	var fg = Color("34d399")
	if not is_running:
		bg = Color("10b981")
		fg = Color("34d399")
	var normal := StyleBoxFlat.new()
	normal.bg_color = Color(bg.r, bg.g, bg.b, 0.2)
	normal.corner_radius_top_left = 999
	normal.corner_radius_top_right = 999
	normal.corner_radius_bottom_left = 999
	normal.corner_radius_bottom_right = 999
	normal.content_margin_left = 2
	normal.content_margin_right = 2
	normal.content_margin_top = 2
	normal.content_margin_bottom = 2
	play_pause.add_theme_stylebox_override("normal", normal)
	play_pause.add_theme_stylebox_override("hover", normal)
	play_pause.add_theme_stylebox_override("pressed", normal)
	play_pause.add_theme_color_override("font_color", fg)
	play_pause.add_theme_font_size_override("font_size", 12)

func _style_header_button(btn: Button) -> void:
	btn.add_theme_color_override("font_color", Color("34d399"))
	var normal := StyleBoxFlat.new()
	normal.bg_color = Color("10b981", 0.2)
	normal.corner_radius_top_left = 999
	normal.corner_radius_top_right = 999
	normal.corner_radius_bottom_left = 999
	normal.corner_radius_bottom_right = 999
	btn.add_theme_stylebox_override("normal", normal)

func _style_task_card(card: Panel, highlighted: bool, active: bool, hovered: bool) -> void:
	var normal := StyleBoxFlat.new()
	if highlighted:
		normal.bg_color = Color(0.23, 0.10, 0.05, 0.32) # orange-950/30
		normal.border_color = Color(0.98, 0.55, 0.17, 0.30) # orange-500/30
		normal.border_width_left = 1
		normal.border_width_right = 1
		normal.border_width_top = 1
		normal.border_width_bottom = 1
	else:
		normal.bg_color = Color(0.15, 0.15, 0.15, 0.55) # zinc-800/50
	if active and not highlighted:
		normal.bg_color = Color(0.18, 0.18, 0.18, 0.78)
		normal.border_color = Color(0.16, 0.7, 0.45, 0.3)
		normal.border_width_left = 1
		normal.border_width_right = 1
		normal.border_width_top = 1
		normal.border_width_bottom = 1
	if hovered:
		normal.bg_color = Color(normal.bg_color.r + 0.035, normal.bg_color.g + 0.035, normal.bg_color.b + 0.035, normal.bg_color.a)
	normal.corner_radius_top_left = 8
	normal.corner_radius_top_right = 8
	normal.corner_radius_bottom_left = 8
	normal.corner_radius_bottom_right = 8
	normal.content_margin_left = 8
	normal.content_margin_right = 8
	normal.content_margin_top = 5
	normal.content_margin_bottom = 5
	normal.shadow_color = Color(0, 0, 0, 0.35)
	normal.shadow_size = 4
	normal.shadow_offset = Vector2(0, 1)
	card.add_theme_stylebox_override("panel", normal)

func _style_sidebar_button(btn: Button) -> void:
	btn.add_theme_color_override("font_color", Color("6b7280"))
	btn.add_theme_font_size_override("font_size", 12)
	var normal := StyleBoxFlat.new()
	normal.bg_color = Color("141414")
	normal.corner_radius_top_left = 6
	normal.corner_radius_top_right = 6
	normal.corner_radius_bottom_left = 6
	normal.corner_radius_bottom_right = 6
	normal.border_width_bottom = 1
	normal.border_color = Color("27272a")
	normal.content_margin_left = 4
	normal.content_margin_right = 4
	normal.content_margin_top = 4
	normal.content_margin_bottom = 4
	btn.add_theme_stylebox_override("normal", normal)

	var hover := StyleBoxFlat.new()
	hover.bg_color = Color("1f1f1f")
	hover.corner_radius_top_left = 6
	hover.corner_radius_top_right = 6
	hover.corner_radius_bottom_left = 6
	hover.corner_radius_bottom_right = 6
	hover.border_width_bottom = 1
	hover.border_color = Color("27272a")
	btn.add_theme_stylebox_override("hover", hover)

	var pressed := StyleBoxFlat.new()
	pressed.bg_color = Color("181818")
	pressed.corner_radius_top_left = 6
	pressed.corner_radius_top_right = 6
	pressed.corner_radius_bottom_left = 6
	pressed.corner_radius_bottom_right = 6
	pressed.border_width_bottom = 1
	pressed.border_color = Color("27272a")
	btn.add_theme_stylebox_override("pressed", pressed)
