-- Stroke Increment - Hammerspoon bindings for Adobe Illustrator
--
-- Illustrator does not list scripts in its Keyboard Shortcuts dialog, so the
-- binding comes from outside. Its menu bar is exposed to the Accessibility API,
-- which lets Hammerspoon drive File > Scripts > ... directly and gives you any
-- key combination you like.
--
-- Hotkeys are global in Hammerspoon, so these are held in a modal that is only
-- active while Illustrator is frontmost. Without that, Ctrl+] would be
-- swallowed in every other application.

local M = {}

-- Edit these. Modifiers: "ctrl", "shift", "alt", "cmd".
-- Control is unused anywhere in Illustrator's default shortcut set, so these
-- four are conflict-free. Cmd+[ and Cmd+] are Send Backward / Send Forward.
M.bindings = {
  { mods = { "ctrl" },            key = "]", script = "Stroke Weight Up" },
  { mods = { "ctrl" },            key = "[", script = "Stroke Weight Down" },
  { mods = { "ctrl", "shift" },   key = "]", script = "Stroke Weight Up Large" },
  { mods = { "ctrl", "shift" },   key = "[", script = "Stroke Weight Down Large" },
}

M.bundleID = "com.adobe.illustrator"

-- Holding the key ramps the weight. Set false for one step per press.
M.keyRepeat = true

-- Shortest gap between steps, in seconds. A menu call through the Accessibility
-- API is not instant, and key auto-repeat outruns it: the events queue in the
-- OS and the weight carries on climbing after you let go. Dropping the repeats
-- that arrive too close together is what stops that. Raise it if the ramp still
-- overshoots, lower it for a faster ramp.
M.minInterval = 0.06

local modal = hs.hotkey.modal.new()
local watcher = nil
local lastRun = 0

local function runScript(name)
  local now = hs.timer.secondsSinceEpoch()
  if now - lastRun < M.minInterval then return end
  lastRun = now

  local app = hs.application.get(M.bundleID)
  if not app then return end

  if not app:selectMenuItem({ "File", "Scripts", name }) then
    hs.alert.show("Stroke Increment: '" .. name .. "' not found in File > Scripts")
  end
end

for _, binding in ipairs(M.bindings) do
  local action = function() runScript(binding.script) end
  modal:bind(
    binding.mods,
    binding.key,
    action,                              -- on press
    nil,                                 -- on release
    M.keyRepeat and action or nil        -- on auto-repeat
  )
end

local function updateForApp(app)
  if app and app:bundleID() == M.bundleID then
    modal:enter()
  else
    modal:exit()
  end
end

function M.start()
  if watcher then return M end

  watcher = hs.application.watcher.new(function(_, event, app)
    if event == hs.application.watcher.activated
      or event == hs.application.watcher.deactivated
      or event == hs.application.watcher.terminated then
      updateForApp(hs.application.frontmostApplication())
    end
  end)
  watcher:start()

  -- Illustrator may already be frontmost when this loads.
  updateForApp(hs.application.frontmostApplication())

  return M
end

function M.stop()
  modal:exit()
  if watcher then
    watcher:stop()
    watcher = nil
  end
  return M
end

return M
