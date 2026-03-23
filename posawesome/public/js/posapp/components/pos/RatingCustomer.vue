<template>
  <v-row justify="center">
    <v-dialog
      v-model="ratingDialog"
      max-width="450px"
    >
      <v-card>
        <v-card-title class="headline primary--text">
          <v-icon left color="primary">mdi-star</v-icon>
          {{ __('Customer Rating') }}
        </v-card-title>

        <v-divider></v-divider>

        <v-card-text class="pa-4">
          <v-row>
            <v-col cols="12">
              <!-- Customer Name Display -->
              <v-alert
                v-if="customer_name"
                dense
                outlined
                color="primary"
                class="mb-2"
              >
                <v-icon left small>mdi-account</v-icon>
                <strong>{{ customer_name }}</strong>
              </v-alert>

              <!-- Ratings Summary -->
              <div class="d-flex justify-space-around mb-4" v-if="!history_loading">
                <v-chip color="green" text-color="white" small>
                  <v-icon left small>mdi-check</v-icon> Good: {{ counts.good }}
                </v-chip>
                <v-chip color="orange" text-color="white" small>
                  <v-icon left small>mdi-alert</v-icon> Risky: {{ counts.risky }}
                </v-chip>
                <v-chip color="red" text-color="white" small>
                  <v-icon left small>mdi-cancel</v-icon> BL: {{ counts.blacklisted }}
                </v-chip>
              </div>
            </v-col>

            <!-- Rating Status -->
            <v-col cols="12">
              <v-select
                dense
                outlined
                color="primary"
                :label="frappe._('Rating Status') + ' *'"
                hide-details
                v-model="rating_status"
                :items="['Good', 'Risky', 'Blacklisted']"
              >
                <template v-slot:selection="{ item }">
                  <v-icon left :color="status_color(item)" small>mdi-circle</v-icon>
                  {{ item }}
                </template>
                <template v-slot:item="{ item }">
                  <v-icon left :color="status_color(item)" small>mdi-circle</v-icon>
                  {{ item }}
                </template>
              </v-select>
            </v-col>

            <!-- Created By -->
            <v-col cols="12">
              <v-autocomplete
                dense
                outlined
                clearable
                color="primary"
                :label="frappe._('Created By') + ' *'"
                hide-details
                v-model="created_by"
                :items="users"
                item-text="name"
                item-value="name"
              ></v-autocomplete>
            </v-col>

            <!-- Note -->
            <v-col cols="12">
              <v-textarea
                dense
                outlined
                color="primary"
                :label="frappe._('Note')"
                hide-details
                v-model="rating_note"
                rows="3"
              ></v-textarea>
            </v-col>

            <!-- History List -->
            <v-col cols="12" v-if="Object.keys(grouped_history).length > 0">
              <v-divider class="mb-2"></v-divider>
              <div class="subtitle-2 grey--text mb-2">{{ __('Rating History') }}</div>
              <v-list dense max-height="250" class="overflow-y-auto">
                <template v-for="(items, status) in grouped_history">
                  <v-subheader :key="'h-' + status" :class="status_text_color(status)">
                    {{ status }}
                  </v-subheader>
                  <v-list-item v-for="(item, i) in items" :key="status + '-' + i">
                    <v-list-item-content>
                      <v-list-item-title class="caption mb-1">
                        <strong>{{ item.note || 'No note' }}</strong>
                      </v-list-item-title>
                      <v-list-item-subtitle class="caption d-flex justify-space-between">
                        <span class="grey--text">{{ __('By') }} {{ item.created_by }}</span>
                        <span class="grey--text">{{ item.posting_date.split(' ')[0] }}</span>
                      </v-list-item-subtitle>
                    </v-list-item-content>
                  </v-list-item>
                  <v-divider :key="'d-' + status"></v-divider>
                </template>
              </v-list>
            </v-col>
          </v-row>
        </v-card-text>

        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="error" text @click="close_dialog">{{ __('Close') }}</v-btn>
          <v-btn color="primary" dark @click="submit_rating" :loading="loading">
            <v-icon left>mdi-check</v-icon>
            {{ __('Save') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </v-row>
</template>

<script>
import { evntBus } from '../../bus';
export default {
  data: () => ({
    ratingDialog: false,
    customer: '',
    customer_name: '',
    rating_status: '',
    rating_note: '',
    created_by: '',
    users: [],
    loading: false,
    history_loading: false,
    history: [],
    counts: { good: 0, risky: 0, blacklisted: 0 },
  }),

  computed: {
    grouped_history() {
      const groups = {};
      this.history.forEach((item) => {
        if (!groups[item.status]) {
          groups[item.status] = [];
        }
        groups[item.status].push(item);
      });
      return groups;
    },
  },

  methods: {
    status_color(status) {
      if (status === 'Good') return 'green';
      if (status === 'Risky') return 'orange';
      if (status === 'Blacklisted') return 'red';
      return 'grey';
    },

    status_text_color(status) {
      if (status === 'Good') return 'green--text';
      if (status === 'Risky') return 'orange--text';
      if (status === 'Blacklisted') return 'red--text';
      return 'grey--text';
    },

    close_dialog() {
      this.ratingDialog = false;
      this.rating_status = '';
      this.rating_note = '';
    },

    fetch_history() {
      const vm = this;
      vm.history_loading = true;
      frappe.call({
        method: 'posawesome.posawesome.api.posapp.get_customer_rating_history',
        args: {
          customer: vm.customer,
        },
        callback: (r) => {
          vm.history_loading = false;
          if (!r.exc && r.message) {
            vm.history = r.message.history || [];
            vm.counts.good = r.message.good_count || 0;
            vm.counts.risky = r.message.risky_count || 0;
            vm.counts.blacklisted = r.message.blacklist_count || 0;
          }
        },
      });
    },

    get_users() {
      if (this.users.length > 0) return;
      frappe.db
        .get_list('User', {
          fields: ['name', 'full_name'],
          filters: { enabled: 1, user_type: 'System User' },
          limit: 500,
          order_by: 'full_name',
        })
        .then((data) => {
          this.users = data.map((u) => ({ name: u.name }));
        });
    },

    submit_rating() {
      if (!this.rating_status) {
        evntBus.$emit('show_mesage', {
          text: __('Please select a rating status.'),
          color: 'error',
        });
        return;
      }
      if (!this.created_by) {
        evntBus.$emit('show_mesage', {
          text: __('Please select a user.'),
          color: 'error',
        });
        return;
      }

      const vm = this;
      vm.loading = true;
      frappe.call({
        method: 'posawesome.posawesome.api.posapp.add_customer_rating',
        args: {
          customer: vm.customer,
          status: vm.rating_status,
          created_by: vm.created_by,
          note: vm.rating_note,
        },
        callback: (r) => {
          vm.loading = false;
          if (!r.exc && r.message) {
            evntBus.$emit('show_mesage', {
              text: __('Rating saved successfully.'),
              color: 'success',
            });
            // Update customer list with new counts
            evntBus.$emit('update_customer_rating_counts', {
              customer: vm.customer,
              counts: r.message,
            });
            frappe.utils.play_sound('submit');
            vm.close_dialog();
          } else {
            frappe.utils.play_sound('error');
            evntBus.$emit('show_mesage', {
              text: __('Failed to save rating.'),
              color: 'error',
            });
          }
        },
      });
    },
  },

  created() {
    evntBus.$on('open_customer_rating', (data) => {
      this.customer = data.name;
      this.customer_name = data.customer_name;
      this.created_by = frappe.session.user;
      this.rating_status = '';
      this.rating_note = '';
      this.history = [];
      this.counts = { good: 0, risky: 0, blacklisted: 0 };
      this.ratingDialog = true;
      this.get_users();
      this.fetch_history();
    });
  },
};
</script>
