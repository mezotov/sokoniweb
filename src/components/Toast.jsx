export default function Toast({ toast }) {
<<<<<<< HEAD
  if (!toast) return null;
  return (
    <div className={`toast ${toast.type}`}>
      <span>{toast.type === "success" ? "✅" : toast.type === "warn" ? "⚠️" : "ℹ️"}</span>
      {toast.msg}
    </div>
  );
}
=======
	if (!toast) return null;
	return (
		<div className={`toast ${toast.type}`}>
			<span>
				{toast.type === "success"
					? "✅"
					: toast.type === "warn"
						? "⚠️"
						: "ℹ️"}
			</span>
			{toast.msg}
		</div>
	);
}
>>>>>>> 6a6e0acbcd0f45c7f450f8451744b9f22b6ee53a
