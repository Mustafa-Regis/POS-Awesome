frappe.ui.form.on("Customer", {
	refresh: function(frm) {
		frm.set_query("created_by", "rating_history", function() {
			return {
				filters: {
					"enabled": 1,
					"user_type": "System User"
				}
			};
		});
	}
});
