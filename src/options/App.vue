<template>
    <div class="settings-container">
        <div class="settings-header">
            <strong>SzuruChrome settings</strong>
        </div>

        <div class="settings-content">
            <label>
                Szurubooru URL
                <br />
                <input type="text" name="domain" v-model="domain" />
            </label>
            <br />
            <label>
                Username
                <br />
                <input type="text" name="username" v-model="username" />
            </label>
            <label>
                Authentication token
                <br />
                <input type="text" name="token" v-model="authToken" />
            </label>
            <br />
            <label>
                Automatically search for similar posts
                <input
                    type="checkbox"
                    name="autoSearchSimilar"
                    v-model="autoSearchSimilar"
                />
            </label>
            <br />
            <div class="settings-footer-buttons">
                <button @click="testConnection">Test connection</button>
                <button @click="saveSettings" class="primary">Save settings</button>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import Vue from "vue";
import { oc } from "ts-optchain";
import SzuruWrapper from "../SzuruWrapper";
import { Config, SzuruSiteConfig } from "../Config";

export default Vue.extend({
    data() {
        return {
            domain: "",
            username: "",
            authToken: "",
            autoSearchSimilar: false
        };
    },
    methods: {
        async testConnection() {
            if (!this.domain || !this.username || !this.authToken) {
                alert("Domain, username and authentication token are all required.");
                return;
            }

            const api = new SzuruWrapper(this.domain, this.username, this.authToken);
            try {
                const info = (await api.getInfo()) as any;
                const instanceName = oc(info).config.domain;

                if (instanceName == undefined) {
                    alert(`Connected to ${this.domain}, but it is not a szurubooru instance.`);
                } else {
                    alert(`Connected to ${info.config.name} at ${this.domain}`);
                }
            } catch (ex) {
                alert("Couldn't connect to " + this.domain + "\n\n" + ex);
            }
        },
        async saveSettings() {
            let config = await Config.load();
            console.dir(config);

            // We currently only support one domain
            let siteConfig = new SzuruSiteConfig();
            siteConfig.domain = this.domain;
            siteConfig.username = this.username;
            siteConfig.authToken = this.authToken;
            config.sites = [siteConfig];
            config.autoSearchSimilar = this.autoSearchSimilar;

            await config.save();
        }
    },
    async mounted() {
        let config = await Config.load();

        console.log(`Loaded ${config.sites.length} sites`);

        // We currently only support one domain
        if (config.sites.length > 0) {
            this.domain = config.sites[0].domain;
            this.username = config.sites[0].username;
            this.authToken = config.sites[0].authToken;
            this.autoSearchSimilar = config.autoSearchSimilar;
        }
    }
});
</script>

<style scoped>
.settings-container {
    margin: 0;
    position: absolute;
    top: 50%;
    left: 50%;
    -ms-transform: translate(-50%, -50%);
    transform: translate(-50%, -50%);

    padding: 20px;
    background-color: #f5f5f5;
}

.settings-header {
    padding: 0 0 20px 0;
}

.settings-footer-buttons {
    padding: 20px 0 0 0;
    float: right;
}

.settings-content > label {
    display: inline-block;
}
</style>
