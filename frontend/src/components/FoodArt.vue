<script setup lang="ts">
import { computed } from 'vue';
const props = defineProps<{ category: number | null }>();
const kind = computed(() => [1, 9].includes(props.category ?? 0) ? 'cake' : props.category === 7 ? 'pasta' : props.category === 11 ? 'risotto' : props.category === 10 ? 'toast' : props.category === 8 ? 'drink' : 'salad');
const greens = Array.from({ length: 17 }, (_, i) => ({ x: 122 + Math.cos(i * 2.4) * (27 + (i % 4) * 13), y: 89 + Math.sin(i * 2.4) * (17 + (i % 4) * 10), r: i * 47 }));
</script>

<template>
  <svg viewBox="0 0 300 180" class="food-art" :class="`art-${kind}`" aria-hidden="true">
    <ellipse cx="156" cy="151" rx="102" ry="12" fill="#2b3324" opacity=".08" />
    <path d="M260 7 213 180h87V7Z" fill="currentColor" opacity=".06" />
    <g transform="translate(23 0)">
      <ellipse cx="127" cy="96" rx="95" ry="72" fill="#000" opacity=".08" />
      <ellipse cx="126" cy="90" rx="95" ry="72" fill="#fdfbf1" />
      <ellipse cx="126" cy="90" rx="80" ry="59" fill="#eeeadd" />
      <ellipse cx="126" cy="87" rx="74" ry="55" fill="#f6f2e4" />
      <g v-if="kind === 'salad'">
        <g v-for="(leaf, i) in greens" :key="i" :transform="`translate(${leaf.x} ${leaf.y}) rotate(${leaf.r})`">
          <ellipse rx="13" ry="24" :fill="['#55764b','#7d9a51','#375d46','#a1ae60'][i % 4]" />
          <path d="M0-18V18m0-17L8-7M0 7l-8-9" stroke="#dce0a0" stroke-width="1" fill="none" opacity=".5" />
        </g>
        <g v-for="(p, i) in [[86,74],[141,52],[157,98],[110,121],[172,73]]" :key="i">
          <ellipse :cx="p[0]" :cy="p[1]" rx="11" ry="9" fill="#ca5035" /><path :d="`M${p[0]!-5} ${p[1]!}h10`" stroke="#f29b68" stroke-width="2" />
        </g>
        <g fill="#fff8d9" stroke="#e0dabf"><path d="m107 68 12-3 4 12-12 4zM143 112l13 2-2 12-13-2zM79 99l11-4 4 10-11 5zM154 66l11 4-4 10-11-4z" /></g>
      </g>
      <g v-else-if="kind === 'pasta'">
        <ellipse cx="128" cy="90" rx="62" ry="43" fill="#b95834" />
        <path v-for="i in 15" :key="i" :d="`M${76+i*3} ${66+i%3*8} C${190-i*3} ${39+i*2},${170-i*3} ${140-i*2},${86+i*5} ${110-i%4*9} S${62+i*5} ${72+i},${168-i} ${87+i%3*7}`" fill="none" :stroke="i%3 ? '#ecb361' : '#f5cc7c'" stroke-width="4" stroke-linecap="round" />
        <path d="M122 59q-30-30-32-4 4 17 32 4m0 0q7-35 24-18 4 18-24 18" fill="#3d7044" /><g fill="#f9e9bb"><circle cx="145" cy="107" r="3"/><circle cx="101" cy="81" r="2"/><circle cx="151" cy="70" r="3"/><circle cx="122" cy="116" r="2"/></g>
      </g>
      <g v-else-if="kind === 'cake'">
        <path d="m75 66 102-5-9 56-92 13z" fill="#bd7736"/><path d="m75 61 102-6-9 49-92 13z" fill="#eda349"/><path d="m75 61 44-28 58 22-9 24-92 10z" fill="#573a2d"/><path d="m76 86 9 3 3 15 9-2 2-16 47-8 3 11 7-3 3-13 9-1 9-17-101 6z" fill="#573a2d"/><g fill="#f6c879"><circle cx="91" cy="101" r="2"/><circle cx="125" cy="95" r="2"/><circle cx="149" cy="98" r="2"/><circle cx="104" cy="110" r="1.5"/></g>
      </g>
      <g v-else-if="kind === 'toast'" transform="rotate(-14 125 90)">
        <path d="M81 123V75c-13-31 35-42 42-26 17-14 55-3 44 25v49z" fill="#aa713e"/><path d="M87 116V76c-12-26 29-34 37-21 16-13 47-3 37 20v41z" fill="#e8be78"/><path d="M91 109q-10-46 23-45 16-13 34 5 14 14 6 42z" fill="#91a25b"/><path d="m98 94 46-14m-44 22 48-14m-39-9 19-8" stroke="#5d7b43" stroke-width="3" stroke-linecap="round"/><path d="M104 66c-20 10-13 29 1 32 8 2 9 9 20 9 21 0 18-15 29-22 15-11 1-28-13-23-14 5-23-7-37 4" fill="#fffcef"/><circle cx="128" cy="82" r="15" fill="#eebd42"/><circle cx="124" cy="78" r="5" fill="#f8d45c"/>
      </g>
      <g v-else-if="kind === 'risotto'">
        <ellipse cx="126" cy="89" rx="62" ry="41" fill="#cbb387"/>
        <ellipse v-for="i in 70" :key="i" :cx="79+(i*31)%95" :cy="58+(i*17)%61" rx="4" ry="2" :transform="`rotate(${i*31} ${79+(i*31)%95} ${58+(i*17)%61})`" :fill="i%3 ? '#e1d2ad' : '#f0e5ca'" />
        <g v-for="(p,i) in [[99,76],[146,72],[119,108],[157,107]]" :key="i" :transform="`translate(${p[0]} ${p[1]}) rotate(${i*43})`"><path d="M-14 0c0-23 28-23 28 0z" fill="#8b7058"/><path d="M-4 0h8v12h-8z" fill="#cbb493"/><path d="M-10-2h20" stroke="#554b3c" stroke-width="2"/></g>
        <path d="m112 66 7-9m15 32 9 3m-51 18 6 5m47 4 8-7" stroke="#5d7943" stroke-width="3"/>
      </g>
      <g v-else>
        <path d="m95 45 9 88h43l9-88z" fill="#d4e2bd"/><path d="m99 65 7 65h39l7-65z" fill="#c7a957"/><ellipse cx="125" cy="45" rx="31" ry="8" fill="#e9edcc"/><path d="m132 83 23-66" stroke="#6f8958" stroke-width="5"/><circle cx="106" cy="61" r="15" fill="#d3d174" stroke="#faf0bb" stroke-width="3"/>
      </g>
    </g>
    <g fill="#58734a"><path d="M27 150q-22-26-13-33 16 1 13 33m-1-11q6-22 18-16 4 13-18 16"/><path d="m269 30q-20-21-12-28 14 1 12 28m0-10q8-18 16-11 1 12-16 11"/></g>
    <g fill="#453f31" opacity=".5"><circle cx="255" cy="143" r="1.4"/><circle cx="260" cy="148" r="1"/><circle cx="249" cy="150" r="1"/><circle cx="49" cy="31" r="1.3"/></g>
  </svg>
</template>
