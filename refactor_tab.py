import sys

file_path = 'components/TabMeeting.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    text = f.read()

# The block starts at `<div className="space-y-3">` and ends at the corresponding `</div>`.
# But it's easier to find it via:
start_str = '                      <div className="space-y-3">\n                        {activeMeeting.properties'
end_str = '                            </div>\n                          ))}\n                      </div>'

start_idx = text.find(start_str)
end_idx = text.find(end_str) + len(end_str)

if start_idx == -1 or end_idx == -1:
    print("Could not find block")
    sys.exit(1)

extracted_jsx = text[start_idx:end_idx]

# Define the helper
state_def = "  const [isFullScreenMode, setIsFullScreenMode] = useState(false);\n\n"
helper_func = f"""  const renderPropertyList = () => (
{extracted_jsx}
  );

"""

# Insert state_def and helper_func right before the final `return (` of the component
return_str = "  return (\n"
return_idx = text.rfind(return_str)

if return_idx == -1:
    print("Could not find return")
    sys.exit(1)

new_text = text[:return_idx] + state_def + helper_func + text[return_idx:]

# Now replace the original block with `{renderPropertyList()}`
new_text = new_text.replace(extracted_jsx, "                      {renderPropertyList()}")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(new_text)

print("Refactoring successful!")
